"""考试应用服务：命题、状态机、评分、计时与学习证据事务。"""

from __future__ import annotations

import hashlib
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.domain import EvidenceSource, EvidenceType
from app.domain.models import Course, KnowledgePoint
from app.exams.entities import (
    Exam,
    ExamAnswer,
    ExamAttempt,
    ExamQuestion,
    ExamQuestionLink,
    ExamQuestionType,
)
from app.exams.grading import grade_answer, normalize_text, validate_question_content
from app.exams.models import (
    AnswerGradingStatus,
    AnswerSaveOut,
    AttemptOut,
    AttemptQuestionOut,
    AttemptResultAnswerOut,
    AttemptResultOut,
    AttemptStatus,
    AttemptSummaryOut,
    ExamCreate,
    ExamItemCreate,
    ExamItemOut,
    ExamOut,
    ExamStatus,
    GradingStrategy,
    ManualGradeRequest,
    QuestionCreate,
    QuestionOut,
    QuestionResponseKind,
    QuestionTypeCreate,
    QuestionTypeOut,
    QuestionUpdate,
    ReviewQueueItemOut,
    ExamUpdate,
)
from app.exams.repository import ExamRepository
from app.services.learning_evidence import LearningEvidenceRepository
from app.services.mastery_projection_service import MasteryProjectionService


class ExamNotFoundError(LookupError):
    """请求的考试领域对象不存在。"""


class ExamStateError(RuntimeError):
    """业务状态不允许当前操作。"""


def _naive_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(UTC).replace(tzinfo=None)


class ExamService:
    def __init__(
        self,
        db: Session,
        *,
        now_provider: Callable[[], datetime] = utc_now,
    ) -> None:
        self._db = db
        self._repo = ExamRepository(db)
        self._now_provider = now_provider
        self._evidence_repo = LearningEvidenceRepository(db)
        self._projection = MasteryProjectionService(db)

    def _now(self) -> datetime:
        return _naive_utc(self._now_provider())

    def create_question_type(self, payload: QuestionTypeCreate) -> QuestionTypeOut:
        now = self._now()
        record = ExamQuestionType(
            id=str(uuid.uuid4()),
            name=payload.name,
            name_key=normalize_text(payload.name),
            description=payload.description,
            response_kind=payload.response_kind.value,
            grading_strategy=payload.grading_strategy.value,
            is_builtin=False,
            is_archived=False,
            created_at=now,
            updated_at=now,
        )
        try:
            self._db.add(record)
            self._db.commit()
        except IntegrityError as exc:
            self._db.rollback()
            raise ExamStateError("question type name already exists") from exc
        return self._type_out(record)

    def create_question(self, payload: QuestionCreate) -> QuestionOut:
        question_type = self._require_active_type(payload.question_type_id)
        self._validate_course_point(payload.course_id, payload.knowledge_point_id)
        validate_question_content(
            response_kind=QuestionResponseKind(question_type.response_kind),
            grading_strategy=GradingStrategy(question_type.grading_strategy),
            options=payload.options,
            correct_answer=payload.correct_answer,
            keywords=payload.keywords,
        )
        now = self._now()
        record = ExamQuestion(
            id=str(uuid.uuid4()),
            course_id=payload.course_id,
            knowledge_point_id=payload.knowledge_point_id,
            question_type_id=question_type.id,
            prompt=payload.prompt,
            options=list(payload.options),
            correct_answer=payload.correct_answer,
            keywords=list(payload.keywords),
            explanation=payload.explanation,
            difficulty=payload.difficulty,
            default_score=payload.default_score,
            is_archived=False,
            created_at=now,
            updated_at=now,
        )
        try:
            self._db.add(record)
            self._db.commit()
        except Exception:
            self._db.rollback()
            raise
        return self._question_out(record, question_type)

    def update_question(self, question_id: str, payload: QuestionUpdate) -> QuestionOut:
        record = self._require_question(question_id)
        if self._repo.question_is_in_published_exam(question_id):
            raise ExamStateError("question belongs to a published exam and is immutable")

        fields = payload.model_fields_set
        type_id = payload.question_type_id if "question_type_id" in fields else record.question_type_id
        if type_id is None:
            type_id = record.question_type_id
        question_type = self._require_active_type(type_id)
        knowledge_point_id = (
            payload.knowledge_point_id
            if "knowledge_point_id" in fields
            else record.knowledge_point_id
        )
        options = payload.options if "options" in fields else list(record.options or [])
        correct_answer = (
            payload.correct_answer
            if "correct_answer" in fields
            else record.correct_answer
        )
        keywords = payload.keywords if "keywords" in fields else list(record.keywords or [])
        self._validate_course_point(record.course_id, knowledge_point_id)
        validate_question_content(
            response_kind=QuestionResponseKind(question_type.response_kind),
            grading_strategy=GradingStrategy(question_type.grading_strategy),
            options=options,
            correct_answer=correct_answer,
            keywords=keywords,
        )
        if "knowledge_point_id" in fields:
            record.knowledge_point_id = knowledge_point_id
        if "question_type_id" in fields:
            record.question_type_id = type_id
        for name in (
            "prompt",
            "options",
            "correct_answer",
            "keywords",
            "explanation",
            "difficulty",
            "default_score",
            "is_archived",
        ):
            if name in fields:
                setattr(record, name, getattr(payload, name))
        record.updated_at = self._now()
        try:
            self._db.commit()
        except Exception:
            self._db.rollback()
            raise
        return self._question_out(record, question_type)

    def create_exam(self, payload: ExamCreate) -> ExamOut:
        self._require_course(payload.course_id)
        self._validate_exam_items(payload.course_id, payload.items)
        now = self._now()
        record = Exam(
            id=str(uuid.uuid4()),
            course_id=payload.course_id,
            title=payload.title,
            description=payload.description,
            duration_minutes=payload.duration_minutes,
            pass_percentage=payload.pass_percentage,
            shuffle_questions=payload.shuffle_questions,
            status=ExamStatus.DRAFT.value,
            created_at=now,
            updated_at=now,
        )
        try:
            self._db.add(record)
            self._db.flush()
            self._replace_exam_items(record.id, payload.items)
            self._db.commit()
        except Exception:
            self._db.rollback()
            raise
        return self._exam_out(record)

    def update_exam(self, exam_id: str, payload: ExamUpdate) -> ExamOut:
        record = self._require_exam(exam_id)
        if record.status != ExamStatus.DRAFT.value:
            raise ExamStateError("published exam is immutable")
        fields = payload.model_fields_set
        if "items" in fields and payload.items is not None:
            self._validate_exam_items(record.course_id, payload.items)
            self._replace_exam_items(record.id, payload.items)
        for name in (
            "title",
            "description",
            "duration_minutes",
            "pass_percentage",
            "shuffle_questions",
        ):
            if name in fields:
                setattr(record, name, getattr(payload, name))
        record.updated_at = self._now()
        try:
            self._db.commit()
        except Exception:
            self._db.rollback()
            raise
        return self._exam_out(record)

    def publish_exam(self, exam_id: str) -> ExamOut:
        record = self._require_exam(exam_id)
        if record.status == ExamStatus.PUBLISHED.value:
            return self._exam_out(record)
        if record.status != ExamStatus.DRAFT.value:
            raise ExamStateError("only a draft exam can be published")
        links = self._repo.list_exam_links(record.id)
        if not links:
            raise ExamStateError("exam must contain at least one active question")
        items = [
            ExamItemCreate(
                question_id=link.question_id,
                points=link.points,
                position=link.position,
            )
            for link in links
        ]
        try:
            self._validate_exam_items(record.course_id, items)
        except (ValueError, ExamNotFoundError) as exc:
            raise ExamStateError("exam must contain at least one active question") from exc
        now = self._now()
        record.status = ExamStatus.PUBLISHED.value
        record.published_at = now
        record.updated_at = now
        self._db.commit()
        return self._exam_out(record)

    def start_attempt(self, exam_id: str, learner_id: str) -> AttemptOut:
        exam = self._require_exam(exam_id)
        if exam.status != ExamStatus.PUBLISHED.value:
            raise ExamStateError("only a published exam can be attempted")
        learner_id = learner_id.strip()
        if not learner_id:
            raise ValueError("learner id must not be blank")

        current = self._repo.find_current_attempt(exam_id, learner_id)
        now = self._now()
        if current is not None and now < current.expires_at:
            return self._attempt_out(current)
        if current is not None:
            self._finalize_attempt(current, now)
            self._db.commit()

        links = self._repo.list_exam_links(exam.id)
        if not links:
            raise ExamStateError("published exam has no questions")
        attempt = ExamAttempt(
            id=str(uuid.uuid4()),
            exam_id=exam.id,
            learner_id=learner_id,
            status=AttemptStatus.IN_PROGRESS.value,
            started_at=now,
            expires_at=now + timedelta(minutes=exam.duration_minutes),
            awarded_score=0.0,
            max_score=sum(link.points for link in links),
            pending_score=0.0,
            percentage=0.0,
            passed=None,
        )
        try:
            self._db.add(attempt)
            self._db.flush()
            for link in links:
                self._db.add(
                    ExamAnswer(
                        id=str(uuid.uuid4()),
                        attempt_id=attempt.id,
                        question_id=link.question_id,
                        user_answer=None,
                        max_score=link.points,
                        grading_status=AnswerGradingStatus.UNGRADED.value,
                    )
                )
            self._db.commit()
        except Exception:
            self._db.rollback()
            raise
        return self._attempt_out(attempt)

    def get_attempt(self, attempt_id: str, learner_id: str) -> AttemptOut:
        attempt = self._require_attempt(attempt_id, learner_id)
        if (
            attempt.status == AttemptStatus.IN_PROGRESS.value
            and self._now() >= attempt.expires_at
        ):
            self._finalize_attempt(attempt, self._now())
            self._db.commit()
        return self._attempt_out(attempt)

    def save_answer(
        self,
        attempt_id: str,
        learner_id: str,
        question_id: str,
        user_answer: Any,
    ) -> AnswerSaveOut:
        attempt = self._require_attempt(attempt_id, learner_id)
        now = self._now()
        if attempt.status != AttemptStatus.IN_PROGRESS.value:
            raise ExamStateError("attempt is already submitted")
        if now >= attempt.expires_at:
            self._finalize_attempt(attempt, now)
            self._db.commit()
            raise ExamStateError("attempt has expired and was submitted")
        answer = self._repo.get_attempt_answer(attempt.id, question_id)
        if answer is None:
            raise ExamNotFoundError("question is not part of this attempt")
        question = self._require_question(question_id)
        question_type = self._require_type(question.question_type_id)
        self._validate_submitted_answer(
            QuestionResponseKind(question_type.response_kind),
            user_answer,
            list(question.options or []),
        )
        answer.user_answer = user_answer
        answer.saved_at = now
        try:
            self._db.commit()
        except Exception:
            self._db.rollback()
            raise
        return AnswerSaveOut(
            answer_id=answer.id,
            attempt_id=attempt.id,
            question_id=question_id,
            user_answer=answer.user_answer,
            saved_at=now,
        )

    def submit_attempt(self, attempt_id: str, learner_id: str) -> AttemptSummaryOut:
        attempt = self._require_attempt(attempt_id, learner_id)
        if attempt.status != AttemptStatus.IN_PROGRESS.value:
            return self._summary_out(attempt)
        try:
            self._finalize_attempt(attempt, self._now())
            self._db.commit()
        except Exception:
            self._db.rollback()
            raise
        return self._summary_out(attempt)

    def get_result(self, attempt_id: str, learner_id: str) -> AttemptResultOut:
        attempt = self._require_attempt(attempt_id, learner_id)
        if attempt.status == AttemptStatus.IN_PROGRESS.value:
            if self._now() >= attempt.expires_at:
                self._finalize_attempt(attempt, self._now())
                self._db.commit()
            else:
                raise ExamStateError("attempt is not submitted")
        return self._result_out(attempt)

    def list_review_queue(self, course_id: str | None = None) -> list[ReviewQueueItemOut]:
        statement = (
            select(ExamAnswer, ExamAttempt, Exam, ExamQuestion)
            .join(ExamAttempt, ExamAttempt.id == ExamAnswer.attempt_id)
            .join(Exam, Exam.id == ExamAttempt.exam_id)
            .join(ExamQuestion, ExamQuestion.id == ExamAnswer.question_id)
            .where(ExamAnswer.grading_status == AnswerGradingStatus.PENDING_MANUAL.value)
            .order_by(ExamAttempt.submitted_at.asc())
        )
        if course_id is not None:
            statement = statement.where(Exam.course_id == course_id)
        rows = self._db.execute(statement).all()
        return [
            ReviewQueueItemOut(
                answer_id=answer.id,
                attempt_id=attempt.id,
                exam_id=exam.id,
                exam_title=exam.title,
                learner_id=attempt.learner_id,
                question_id=question.id,
                prompt=question.prompt,
                user_answer=answer.user_answer,
                reference_answer=question.correct_answer,
                points=answer.max_score,
                submitted_at=attempt.submitted_at or attempt.expires_at,
            )
            for answer, attempt, exam, question in rows
        ]

    def grade_manual_answer(
        self, answer_id: str, payload: ManualGradeRequest
    ) -> AttemptSummaryOut:
        answer = self._db.get(ExamAnswer, answer_id)
        if answer is None:
            raise ExamNotFoundError("answer not found")
        if answer.grading_status != AnswerGradingStatus.PENDING_MANUAL.value:
            raise ExamStateError("answer is already graded")
        if payload.score > answer.max_score:
            raise ValueError("manual score cannot exceed question points")
        attempt = self._repo.get_attempt(answer.attempt_id)
        if attempt is None:
            raise ExamNotFoundError("attempt not found")
        answer.awarded_score = payload.score
        answer.is_correct = payload.score == answer.max_score
        answer.feedback = payload.feedback
        answer.grading_status = AnswerGradingStatus.MANUAL.value
        answer.graded_at = self._now()
        try:
            self._project_answer_evidence(attempt, answer)
            self._recalculate_attempt(attempt)
            self._db.commit()
        except Exception:
            self._db.rollback()
            raise
        return self._summary_out(attempt)

    def _finalize_attempt(self, attempt: ExamAttempt, now: datetime) -> None:
        for answer in self._repo.list_attempt_answers(attempt.id):
            question = self._require_question(answer.question_id)
            question_type = self._require_type(question.question_type_id)
            if not self._has_answer(answer.user_answer):
                answer.awarded_score = 0.0
                answer.is_correct = False
                answer.grading_status = AnswerGradingStatus.AUTO.value
                answer.feedback = "未作答"
                answer.graded_at = now
                continue
            outcome = grade_answer(
                response_kind=QuestionResponseKind(question_type.response_kind),
                grading_strategy=GradingStrategy(question_type.grading_strategy),
                submitted_answer=answer.user_answer,
                correct_answer=question.correct_answer,
                keywords=list(question.keywords or []),
            )
            if outcome.pending_manual:
                answer.awarded_score = None
                answer.is_correct = None
                answer.grading_status = AnswerGradingStatus.PENDING_MANUAL.value
                answer.feedback = "等待人工批阅"
                continue
            ratio = outcome.score_ratio or 0.0
            answer.awarded_score = round(answer.max_score * ratio, 4)
            answer.is_correct = outcome.is_correct
            answer.grading_status = AnswerGradingStatus.AUTO.value
            answer.graded_at = now
            if outcome.matched_keywords or outcome.missing_keywords:
                matched = "、".join(outcome.matched_keywords) or "无"
                missing = "、".join(outcome.missing_keywords) or "无"
                answer.feedback = f"命中关键词：{matched}；待补充：{missing}"
            else:
                answer.feedback = "回答正确" if outcome.is_correct else "回答不正确"
            self._project_answer_evidence(attempt, answer)
        attempt.submitted_at = now
        self._recalculate_attempt(attempt)

    def _project_answer_evidence(
        self, attempt: ExamAttempt, answer: ExamAnswer
    ) -> None:
        if answer.evidence_id is not None or not self._has_answer(answer.user_answer):
            return
        question = self._require_question(answer.question_id)
        if not question.knowledge_point_id or answer.awarded_score is None:
            return
        ratio = (
            answer.awarded_score / answer.max_score if answer.max_score > 0 else 0.0
        )
        evidence = self._evidence_repo.create(
            learner_id=attempt.learner_id,
            evidence_type=EvidenceType.EXAM_ANSWER_EVALUATED,
            source=EvidenceSource.EXAM_SYSTEM,
            knowledge_point_id=question.knowledge_point_id,
            course_id=question.course_id,
            question_id=question.id,
            session_id=attempt.id,
            payload={
                "attempt_id": attempt.id,
                "is_correct": bool(answer.is_correct),
                "score": max(0.0, min(1.0, ratio)),
                "difficulty": question.difficulty,
                "awarded_score": answer.awarded_score,
                "max_score": answer.max_score,
            },
        )
        projection = self._projection.project(evidence)
        if projection is not None:
            self._evidence_repo.update_payload(
                evidence.id,
                {
                    "mastery_before": projection.mastery_before,
                    "mastery_after": projection.mastery_after,
                    "confidence": projection.confidence,
                    "evidence_count": projection.evidence_count,
                },
            )
        answer.evidence_id = evidence.id

    def _recalculate_attempt(self, attempt: ExamAttempt) -> None:
        answers = self._repo.list_attempt_answers(attempt.id)
        attempt.awarded_score = round(
            sum(answer.awarded_score or 0.0 for answer in answers), 4
        )
        attempt.pending_score = round(
            sum(
                answer.max_score
                for answer in answers
                if answer.grading_status == AnswerGradingStatus.PENDING_MANUAL.value
            ),
            4,
        )
        attempt.percentage = round(
            (attempt.awarded_score / attempt.max_score * 100.0)
            if attempt.max_score > 0
            else 0.0,
            2,
        )
        exam = self._require_exam(attempt.exam_id)
        if attempt.pending_score > 0:
            attempt.status = AttemptStatus.NEEDS_REVIEW.value
            attempt.passed = None
        else:
            attempt.status = AttemptStatus.GRADED.value
            attempt.passed = attempt.percentage >= exam.pass_percentage

    def _type_out(self, record: ExamQuestionType) -> QuestionTypeOut:
        return QuestionTypeOut(
            id=record.id,
            name=record.name,
            description=record.description,
            response_kind=QuestionResponseKind(record.response_kind),
            grading_strategy=GradingStrategy(record.grading_strategy),
            is_builtin=record.is_builtin,
            is_archived=record.is_archived,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    def _question_out(
        self, record: ExamQuestion, question_type: ExamQuestionType | None = None
    ) -> QuestionOut:
        resolved_type = question_type or self._require_type(record.question_type_id)
        return QuestionOut(
            id=record.id,
            course_id=record.course_id,
            knowledge_point_id=record.knowledge_point_id,
            question_type_id=record.question_type_id,
            question_type_name=resolved_type.name,
            response_kind=QuestionResponseKind(resolved_type.response_kind),
            grading_strategy=GradingStrategy(resolved_type.grading_strategy),
            prompt=record.prompt,
            options=list(record.options or []),
            correct_answer=record.correct_answer,
            keywords=list(record.keywords or []),
            explanation=record.explanation,
            difficulty=record.difficulty,
            default_score=record.default_score,
            is_archived=record.is_archived,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    def _exam_out(self, record: Exam) -> ExamOut:
        items = []
        for link in self._repo.list_exam_links(record.id):
            question = self._require_question(link.question_id)
            items.append(
                ExamItemOut(
                    id=link.id,
                    question_id=link.question_id,
                    points=link.points,
                    position=link.position,
                    question=self._question_out(question),
                )
            )
        return ExamOut(
            id=record.id,
            course_id=record.course_id,
            title=record.title,
            description=record.description,
            duration_minutes=record.duration_minutes,
            pass_percentage=record.pass_percentage,
            shuffle_questions=record.shuffle_questions,
            status=ExamStatus(record.status),
            items=items,
            total_points=sum(item.points for item in items),
            created_at=record.created_at,
            updated_at=record.updated_at,
            published_at=record.published_at,
        )

    def _attempt_out(self, attempt: ExamAttempt) -> AttemptOut:
        exam = self._require_exam(attempt.exam_id)
        answers = {
            answer.question_id: answer
            for answer in self._repo.list_attempt_answers(attempt.id)
        }
        links = self._ordered_links(exam, attempt.id)
        questions: list[AttemptQuestionOut] = []
        for display_position, link in enumerate(links, start=1):
            question = self._require_question(link.question_id)
            question_type = self._require_type(question.question_type_id)
            answer = answers.get(question.id)
            questions.append(
                AttemptQuestionOut(
                    question_id=question.id,
                    question_type_name=question_type.name,
                    response_kind=QuestionResponseKind(question_type.response_kind),
                    prompt=question.prompt,
                    options=list(question.options or []),
                    points=link.points,
                    position=display_position,
                    user_answer=answer.user_answer if answer else None,
                    saved_at=answer.saved_at if answer else None,
                )
            )
        return AttemptOut(
            id=attempt.id,
            exam_id=attempt.exam_id,
            learner_id=attempt.learner_id,
            exam_title=exam.title,
            status=AttemptStatus(attempt.status),
            started_at=attempt.started_at,
            expires_at=attempt.expires_at,
            submitted_at=attempt.submitted_at,
            questions=questions,
        )

    def _summary_out(self, attempt: ExamAttempt) -> AttemptSummaryOut:
        exam = self._require_exam(attempt.exam_id)
        return AttemptSummaryOut(
            id=attempt.id,
            exam_id=attempt.exam_id,
            learner_id=attempt.learner_id,
            exam_title=exam.title,
            status=AttemptStatus(attempt.status),
            started_at=attempt.started_at,
            expires_at=attempt.expires_at,
            submitted_at=attempt.submitted_at,
            awarded_score=attempt.awarded_score,
            max_score=attempt.max_score,
            pending_score=attempt.pending_score,
            percentage=attempt.percentage,
            passed=attempt.passed,
        )

    def _result_out(self, attempt: ExamAttempt) -> AttemptResultOut:
        summary = self._summary_out(attempt)
        answers_by_question = {
            answer.question_id: answer
            for answer in self._repo.list_attempt_answers(attempt.id)
        }
        answers: list[AttemptResultAnswerOut] = []
        for link in self._repo.list_exam_links(attempt.exam_id):
            question = self._require_question(link.question_id)
            question_type = self._require_type(question.question_type_id)
            answer = answers_by_question[question.id]
            answers.append(
                AttemptResultAnswerOut(
                    answer_id=answer.id,
                    question_id=question.id,
                    question_type_name=question_type.name,
                    response_kind=QuestionResponseKind(question_type.response_kind),
                    grading_strategy=GradingStrategy(question_type.grading_strategy),
                    prompt=question.prompt,
                    options=list(question.options or []),
                    user_answer=answer.user_answer,
                    correct_answer=question.correct_answer,
                    keywords=list(question.keywords or []),
                    explanation=question.explanation,
                    points=answer.max_score,
                    awarded_score=answer.awarded_score,
                    is_correct=answer.is_correct,
                    grading_status=AnswerGradingStatus(answer.grading_status),
                    feedback=answer.feedback,
                )
            )
        return AttemptResultOut(**summary.model_dump(), answers=answers)

    def _ordered_links(self, exam: Exam, attempt_id: str) -> list[ExamQuestionLink]:
        links = self._repo.list_exam_links(exam.id)
        if not exam.shuffle_questions:
            return links
        return sorted(
            links,
            key=lambda link: hashlib.sha256(
                f"{attempt_id}:{link.question_id}".encode("utf-8")
            ).hexdigest(),
        )

    def _replace_exam_items(self, exam_id: str, items: list[ExamItemCreate]) -> None:
        self._repo.replace_exam_links(
            exam_id,
            [
                ExamQuestionLink(
                    id=str(uuid.uuid4()),
                    exam_id=exam_id,
                    question_id=item.question_id,
                    points=item.points,
                    position=item.position,
                )
                for item in items
            ],
        )

    def _validate_exam_items(self, course_id: str, items: list[ExamItemCreate]) -> None:
        for item in items:
            question = self._require_question(item.question_id)
            question_type = self._require_type(question.question_type_id)
            if question.course_id != course_id:
                raise ValueError("exam question must belong to the same course")
            if question.is_archived or question_type.is_archived:
                raise ValueError("exam question must be active")

    def _validate_course_point(
        self, course_id: str, knowledge_point_id: str | None
    ) -> None:
        self._require_course(course_id)
        if knowledge_point_id is None:
            return
        point = self._db.get(KnowledgePoint, knowledge_point_id)
        if point is None or point.course_id != course_id:
            raise ValueError("knowledge point does not belong to course")

    def _validate_submitted_answer(
        self,
        response_kind: QuestionResponseKind,
        answer: Any,
        options: list[str],
    ) -> None:
        if answer is None:
            return
        normalized_options = {normalize_text(option) for option in options}
        if response_kind is QuestionResponseKind.SINGLE_CHOICE:
            if not isinstance(answer, str) or normalize_text(answer) not in normalized_options:
                raise ValueError("single-choice answer must be one option")
            return
        if response_kind is QuestionResponseKind.MULTIPLE_CHOICE:
            if not isinstance(answer, list) or not all(
                isinstance(value, str) for value in answer
            ):
                raise ValueError("multiple-choice answer must be an option list")
            normalized = [normalize_text(value) for value in answer]
            if len(set(normalized)) != len(normalized) or not set(normalized).issubset(
                normalized_options
            ):
                raise ValueError("multiple-choice answer must be an option list")
            return
        if response_kind is QuestionResponseKind.BOOLEAN:
            if not isinstance(answer, bool):
                raise ValueError("boolean answer must be true or false")
            return
        if not isinstance(answer, str) or len(answer) > 8_000:
            raise ValueError("text answer must contain at most 8000 characters")

    @staticmethod
    def _has_answer(value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        if isinstance(value, list):
            return bool(value)
        return isinstance(value, bool)

    def _require_course(self, course_id: str) -> Course:
        record = self._db.get(Course, course_id)
        if record is None:
            raise ExamNotFoundError("course not found")
        return record

    def _require_type(self, question_type_id: str) -> ExamQuestionType:
        record = self._repo.get_question_type(question_type_id)
        if record is None:
            raise ExamNotFoundError("question type not found")
        return record

    def _require_active_type(self, question_type_id: str) -> ExamQuestionType:
        record = self._require_type(question_type_id)
        if record.is_archived:
            raise ExamStateError("question type is archived")
        return record

    def _require_question(self, question_id: str) -> ExamQuestion:
        record = self._repo.get_question(question_id)
        if record is None:
            raise ExamNotFoundError("question not found")
        return record

    def _require_exam(self, exam_id: str) -> Exam:
        record = self._repo.get_exam(exam_id)
        if record is None:
            raise ExamNotFoundError("exam not found")
        return record

    def _require_attempt(self, attempt_id: str, learner_id: str) -> ExamAttempt:
        record = self._repo.get_attempt(attempt_id)
        if record is None or record.learner_id != learner_id:
            raise ExamNotFoundError("attempt not found")
        return record

