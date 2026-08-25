"""考试持久化查询。Repository 不控制事务提交。"""

from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.exams.entities import (
    Exam,
    ExamAnswer,
    ExamAttempt,
    ExamQuestion,
    ExamQuestionLink,
    ExamQuestionType,
)
from app.exams.models import AttemptStatus, ExamStatus


class ExamRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_question_type(self, question_type_id: str) -> ExamQuestionType | None:
        return self.db.get(ExamQuestionType, question_type_id)

    def get_question(self, question_id: str) -> ExamQuestion | None:
        return self.db.get(ExamQuestion, question_id)

    def get_exam(self, exam_id: str) -> Exam | None:
        return self.db.get(Exam, exam_id)

    def list_exam_links(self, exam_id: str) -> list[ExamQuestionLink]:
        return list(
            self.db.scalars(
                select(ExamQuestionLink)
                .where(ExamQuestionLink.exam_id == exam_id)
                .order_by(ExamQuestionLink.position.asc())
            ).all()
        )

    def replace_exam_links(self, exam_id: str, links: list[ExamQuestionLink]) -> None:
        self.db.execute(delete(ExamQuestionLink).where(ExamQuestionLink.exam_id == exam_id))
        self.db.add_all(links)
        self.db.flush()

    def question_is_in_published_exam(self, question_id: str) -> bool:
        return (
            self.db.scalar(
                select(Exam.id)
                .join(ExamQuestionLink, ExamQuestionLink.exam_id == Exam.id)
                .where(
                    ExamQuestionLink.question_id == question_id,
                    Exam.status == ExamStatus.PUBLISHED.value,
                )
                .limit(1)
            )
            is not None
        )

    def get_attempt(self, attempt_id: str) -> ExamAttempt | None:
        return self.db.get(ExamAttempt, attempt_id)

    def find_current_attempt(self, exam_id: str, learner_id: str) -> ExamAttempt | None:
        return self.db.scalar(
            select(ExamAttempt)
            .where(
                ExamAttempt.exam_id == exam_id,
                ExamAttempt.learner_id == learner_id,
                ExamAttempt.status == AttemptStatus.IN_PROGRESS.value,
            )
            .order_by(ExamAttempt.started_at.desc())
            .limit(1)
        )

    def list_attempt_answers(self, attempt_id: str) -> list[ExamAnswer]:
        return list(
            self.db.scalars(
                select(ExamAnswer).where(ExamAnswer.attempt_id == attempt_id)
            ).all()
        )

    def get_attempt_answer(self, attempt_id: str, question_id: str) -> ExamAnswer | None:
        return self.db.scalar(
            select(ExamAnswer).where(
                ExamAnswer.attempt_id == attempt_id,
                ExamAnswer.question_id == question_id,
            )
        )

