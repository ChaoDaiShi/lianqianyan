"""考试系统 SQLAlchemy 实体。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utc_now
from app.domain.models import Base
from app.exams.models import AnswerGradingStatus, AttemptStatus, ExamStatus


class ExamQuestionType(Base):
    __tablename__ = "exam_question_types"
    __table_args__ = (UniqueConstraint("name_key", name="uq_exam_question_type_name_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(60))
    name_key: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    response_kind: Mapped[str] = mapped_column(String(30))
    grading_strategy: Mapped[str] = mapped_column(String(30))
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    course_id: Mapped[str] = mapped_column(String(36), index=True)
    knowledge_point_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    question_type_id: Mapped[str] = mapped_column(String(36), index=True)
    prompt: Mapped[str] = mapped_column(Text)
    options: Mapped[list] = mapped_column(JSON, default=list)
    correct_answer: Mapped[object | None] = mapped_column(JSON, nullable=True)
    keywords: Mapped[list] = mapped_column(JSON, default=list)
    explanation: Mapped[str] = mapped_column(Text, default="")
    difficulty: Mapped[float] = mapped_column(Float, default=0.5)
    default_score: Mapped[float] = mapped_column(Float, default=5.0)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    course_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    pass_percentage: Mapped[float] = mapped_column(Float, default=60.0)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default=ExamStatus.DRAFT.value, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ExamQuestionLink(Base):
    __tablename__ = "exam_question_links"
    __table_args__ = (
        UniqueConstraint("exam_id", "question_id", name="uq_exam_question_link"),
        UniqueConstraint("exam_id", "position", name="uq_exam_question_position"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    exam_id: Mapped[str] = mapped_column(String(36), index=True)
    question_id: Mapped[str] = mapped_column(String(36), index=True)
    points: Mapped[float] = mapped_column(Float)
    position: Mapped[int] = mapped_column(Integer)


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    exam_id: Mapped[str] = mapped_column(String(36), index=True)
    learner_id: Mapped[str] = mapped_column(String(36), index=True)
    status: Mapped[str] = mapped_column(
        String(24), default=AttemptStatus.IN_PROGRESS.value, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    awarded_score: Mapped[float] = mapped_column(Float, default=0.0)
    max_score: Mapped[float] = mapped_column(Float, default=0.0)
    pending_score: Mapped[float] = mapped_column(Float, default=0.0)
    percentage: Mapped[float] = mapped_column(Float, default=0.0)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)


class ExamAnswer(Base):
    __tablename__ = "exam_answers"
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_exam_answer_attempt_question"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    attempt_id: Mapped[str] = mapped_column(String(36), index=True)
    question_id: Mapped[str] = mapped_column(String(36), index=True)
    user_answer: Mapped[object | None] = mapped_column(JSON, nullable=True)
    saved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    awarded_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_score: Mapped[float] = mapped_column(Float)
    grading_status: Mapped[str] = mapped_column(
        String(24), default=AnswerGradingStatus.UNGRADED.value, index=True
    )
    feedback: Mapped[str] = mapped_column(Text, default="")
    evidence_id: Mapped[str | None] = mapped_column(String(36), nullable=True, unique=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

