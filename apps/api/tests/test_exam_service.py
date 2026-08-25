from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker

from tests.seed_fixtures import TEST_LEARNER_ID, seed_test_data
from app.domain import Base, LearningEvidence, MasteryRecord
from app.exams import (
    AttemptStatus,
    ExamCreate,
    ExamItemCreate,
    ExamService,
    ExamStateError,
    ExamUpdate,
    GradingStrategy,
    ManualGradeRequest,
    QuestionCreate,
    QuestionResponseKind,
    QuestionTypeCreate,
    QuestionUpdate,
)

COURSE_ID = "course-os"
LEARNER_ID = TEST_LEARNER_ID


class MutableClock:
    def __init__(self) -> None:
        self.current = datetime(2026, 8, 25, 8, 0, tzinfo=timezone.utc)

    def __call__(self) -> datetime:
        return self.current


@pytest.fixture()
def service_context(tmp_path: Path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'exam-service.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as seed_session:
        seed_test_data(seed_session)
    clock = MutableClock()
    with factory() as db:
        yield ExamService(db, now_provider=clock), db, clock
    engine.dispose()


def _single_choice(service: ExamService, *, prompt: str = "死锁的必要条件是？"):
    question_type = service.create_question_type(
        QuestionTypeCreate(
            name="自定义单选题",
            description="从选项中选择一个答案",
            response_kind=QuestionResponseKind.SINGLE_CHOICE,
            grading_strategy=GradingStrategy.EXACT,
        )
    )
    return service.create_question(
        QuestionCreate(
            course_id=COURSE_ID,
            knowledge_point_id="kp-deadlock",
            question_type_id=question_type.id,
            prompt=prompt,
            options=["互斥", "可抢占", "无限资源"],
            correct_answer="互斥",
            explanation="互斥是死锁的四个必要条件之一。",
            difficulty=0.6,
            default_score=10,
        )
    )


def _manual_question(service: ExamService):
    question_type = service.create_question_type(
        QuestionTypeCreate(
            name="自定义论述题",
            description="按评分反馈人工批阅",
            response_kind=QuestionResponseKind.LONG_TEXT,
            grading_strategy=GradingStrategy.MANUAL,
        )
    )
    return service.create_question(
        QuestionCreate(
            course_id=COURSE_ID,
            knowledge_point_id="kp-deadlock",
            question_type_id=question_type.id,
            prompt="请解释死锁预防与避免的区别。",
            correct_answer="预防破坏必要条件；避免根据安全状态决定分配。",
            explanation="人工批阅时结合概念准确性评分。",
            difficulty=0.8,
            default_score=10,
        )
    )


def _exam(service: ExamService, *question_ids: str, duration_minutes: int = 30):
    exam = service.create_exam(
        ExamCreate(
            course_id=COURSE_ID,
            title="操作系统阶段测评",
            description="用于检验死锁相关概念",
            duration_minutes=duration_minutes,
            pass_percentage=60,
            shuffle_questions=False,
            items=[
                ExamItemCreate(question_id=question_id, points=10, position=index)
                for index, question_id in enumerate(question_ids, start=1)
            ],
        )
    )
    return service.publish_exam(exam.id)


def test_custom_question_creation_validates_course_knowledge_point_and_content(
    service_context,
) -> None:
    service, _, _ = service_context
    question = _single_choice(service)

    assert question.response_kind is QuestionResponseKind.SINGLE_CHOICE
    assert question.grading_strategy is GradingStrategy.EXACT
    assert question.options == ["互斥", "可抢占", "无限资源"]
    assert question.correct_answer == "互斥"

    with pytest.raises(ValueError, match="knowledge point does not belong to course"):
        service.create_question(
            QuestionCreate(
                course_id=COURSE_ID,
                knowledge_point_id="kp-from-another-course",
                question_type_id=question.question_type_id,
                prompt="错误课程题目",
                options=["A", "B"],
                correct_answer="A",
                difficulty=0.5,
                default_score=5,
            )
        )


def test_publish_requires_valid_items_and_locks_exam_question_structure(
    service_context,
) -> None:
    service, _, _ = service_context
    empty = service.create_exam(
        ExamCreate(
            course_id=COURSE_ID,
            title="空试卷",
            duration_minutes=20,
            pass_percentage=60,
            items=[],
        )
    )
    with pytest.raises(ExamStateError, match="at least one active question"):
        service.publish_exam(empty.id)

    question = _single_choice(service)
    published = _exam(service, question.id)
    assert published.status.value == "published"

    with pytest.raises(ExamStateError, match="published exam is immutable"):
        service.update_exam(published.id, ExamUpdate(title="被篡改"))
    with pytest.raises(ExamStateError, match="published exam"):
        service.update_question(question.id, QuestionUpdate(prompt="改变后的题干"))


def test_start_attempt_resumes_and_never_exposes_answer_material(service_context) -> None:
    service, _, clock = service_context
    question = _single_choice(service)
    exam = _exam(service, question.id)

    first = service.start_attempt(exam.id, LEARNER_ID)
    clock.current += timedelta(minutes=5)
    resumed = service.start_attempt(exam.id, LEARNER_ID)

    assert resumed.id == first.id
    assert resumed.expires_at == first.started_at + timedelta(minutes=30)
    assert resumed.questions[0].user_answer is None
    payload = resumed.model_dump(mode="json")
    serialized = str(payload)
    assert "correct_answer" not in serialized
    assert "keywords" not in serialized
    assert "explanation" not in serialized


def test_autosave_and_submit_grade_objective_answers_idempotently(service_context) -> None:
    service, db, _ = service_context
    question = _single_choice(service)
    exam = _exam(service, question.id)
    attempt = service.start_attempt(exam.id, LEARNER_ID)

    saved = service.save_answer(
        attempt.id,
        LEARNER_ID,
        question.id,
        "互斥",
    )
    submitted = service.submit_attempt(attempt.id, LEARNER_ID)
    repeated = service.submit_attempt(attempt.id, LEARNER_ID)

    assert saved.user_answer == "互斥"
    assert submitted.status is AttemptStatus.GRADED
    assert submitted.awarded_score == 10
    assert submitted.max_score == 10
    assert submitted.pending_score == 0
    assert submitted.percentage == 100
    assert submitted.passed is True
    assert repeated.model_dump() == submitted.model_dump()
    assert db.scalar(select(func.count(LearningEvidence.id))) == 1


def test_manual_answers_wait_for_review_then_create_one_evidence(service_context) -> None:
    service, db, _ = service_context
    objective = _single_choice(service)
    manual = _manual_question(service)
    exam = _exam(service, objective.id, manual.id)
    attempt = service.start_attempt(exam.id, LEARNER_ID)
    service.save_answer(attempt.id, LEARNER_ID, objective.id, "互斥")
    service.save_answer(
        attempt.id,
        LEARNER_ID,
        manual.id,
        "预防会破坏必要条件，避免会判断系统是否安全。",
    )

    pending = service.submit_attempt(attempt.id, LEARNER_ID)
    assert pending.status is AttemptStatus.NEEDS_REVIEW
    assert pending.awarded_score == 10
    assert pending.pending_score == 10
    assert pending.percentage == 50
    assert pending.passed is None

    queue = service.list_review_queue(course_id=COURSE_ID)
    assert len(queue) == 1
    reviewed = service.grade_manual_answer(
        queue[0].answer_id,
        ManualGradeRequest(score=8, feedback="概念正确，安全状态说明可更具体。"),
    )

    assert reviewed.status is AttemptStatus.GRADED
    assert reviewed.awarded_score == 18
    assert reviewed.pending_score == 0
    assert reviewed.percentage == 90
    assert reviewed.passed is True
    assert db.scalar(select(func.count(LearningEvidence.id))) == 2

    with pytest.raises(ExamStateError, match="already graded"):
        service.grade_manual_answer(
            queue[0].answer_id,
            ManualGradeRequest(score=9, feedback="重复评分"),
        )
    assert db.scalar(select(func.count(LearningEvidence.id))) == 2


def test_result_reveals_answers_only_after_submission(service_context) -> None:
    service, _, _ = service_context
    question = _single_choice(service)
    exam = _exam(service, question.id)
    attempt = service.start_attempt(exam.id, LEARNER_ID)

    with pytest.raises(ExamStateError, match="not submitted"):
        service.get_result(attempt.id, LEARNER_ID)

    service.save_answer(attempt.id, LEARNER_ID, question.id, "可抢占")
    service.submit_attempt(attempt.id, LEARNER_ID)
    result = service.get_result(attempt.id, LEARNER_ID)

    assert result.answers[0].correct_answer == "互斥"
    assert result.answers[0].explanation.startswith("互斥")
    assert result.answers[0].is_correct is False
    assert result.answers[0].awarded_score == 0


def test_expired_attempt_is_finalized_before_a_late_save(service_context) -> None:
    service, _, clock = service_context
    question = _single_choice(service)
    exam = _exam(service, question.id, duration_minutes=1)
    attempt = service.start_attempt(exam.id, LEARNER_ID)
    clock.current += timedelta(minutes=2)

    with pytest.raises(ExamStateError, match="attempt has expired and was submitted"):
        service.save_answer(attempt.id, LEARNER_ID, question.id, "互斥")

    result = service.get_result(attempt.id, LEARNER_ID)
    assert result.status is AttemptStatus.GRADED
    assert result.awarded_score == 0
    assert result.answers[0].user_answer is None


def test_exam_evidence_updates_mastery_once_with_real_score(service_context) -> None:
    service, db, _ = service_context
    question = _single_choice(service)
    exam = _exam(service, question.id)
    before = db.scalar(
        select(MasteryRecord).where(
            MasteryRecord.learner_id == LEARNER_ID,
            MasteryRecord.knowledge_point_id == "kp-deadlock",
        )
    )
    assert before is not None
    initial_count = before.evidence_count
    attempt = service.start_attempt(exam.id, LEARNER_ID)
    service.save_answer(attempt.id, LEARNER_ID, question.id, "互斥")
    service.submit_attempt(attempt.id, LEARNER_ID)
    service.submit_attempt(attempt.id, LEARNER_ID)

    db.expire_all()
    after = db.scalar(
        select(MasteryRecord).where(
            MasteryRecord.learner_id == LEARNER_ID,
            MasteryRecord.knowledge_point_id == "kp-deadlock",
        )
    )
    assert after is not None
    assert after.evidence_count == initial_count + 1
    evidence = db.scalar(select(LearningEvidence))
    assert evidence is not None
    assert evidence.evidence_type == "exam_answer_evaluated"
    assert evidence.source == "exam_system"
