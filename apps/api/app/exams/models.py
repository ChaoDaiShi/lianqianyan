"""考试系统的稳定领域契约。

题型允许自定义名称与说明，但作答形态、评分策略必须来自安全白名单。
用户内容只作为数据保存和比较，绝不作为代码、正则或表达式执行。
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


class QuestionResponseKind(str, Enum):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    BOOLEAN = "boolean"
    SHORT_TEXT = "short_text"
    LONG_TEXT = "long_text"


class GradingStrategy(str, Enum):
    EXACT = "exact"
    SET_EXACT = "set_exact"
    KEYWORD = "keyword"
    MANUAL = "manual"


COMPATIBLE_GRADING: dict[QuestionResponseKind, frozenset[GradingStrategy]] = {
    QuestionResponseKind.SINGLE_CHOICE: frozenset({GradingStrategy.EXACT}),
    QuestionResponseKind.MULTIPLE_CHOICE: frozenset({GradingStrategy.SET_EXACT}),
    QuestionResponseKind.BOOLEAN: frozenset({GradingStrategy.EXACT}),
    QuestionResponseKind.SHORT_TEXT: frozenset(
        {GradingStrategy.EXACT, GradingStrategy.KEYWORD, GradingStrategy.MANUAL}
    ),
    QuestionResponseKind.LONG_TEXT: frozenset(
        {GradingStrategy.KEYWORD, GradingStrategy.MANUAL}
    ),
}


class QuestionTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    description: str = Field(default="", max_length=500)
    response_kind: QuestionResponseKind
    grading_strategy: GradingStrategy

    @field_validator("name", "description")
    @classmethod
    def _strip_text(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def _validate_compatibility(self) -> "QuestionTypeCreate":
        allowed = COMPATIBLE_GRADING[self.response_kind]
        if self.grading_strategy not in allowed:
            raise ValueError(
                f"grading strategy {self.grading_strategy.value} is not compatible "
                f"with {self.response_kind.value}"
            )
        return self


class GradeOutcome(BaseModel):
    score_ratio: float | None = Field(default=None, ge=0.0, le=1.0)
    is_correct: bool | None = None
    pending_manual: bool = False
    matched_keywords: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)


class ExamStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class AttemptStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    NEEDS_REVIEW = "needs_review"
    GRADED = "graded"


class AnswerGradingStatus(str, Enum):
    UNGRADED = "ungraded"
    AUTO = "auto"
    PENDING_MANUAL = "pending_manual"
    MANUAL = "manual"


class QuestionTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    description: str | None = Field(default=None, max_length=500)
    response_kind: QuestionResponseKind | None = None
    grading_strategy: GradingStrategy | None = None
    is_archived: bool | None = None

    @field_validator("name", "description")
    @classmethod
    def _strip_optional_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class QuestionTypeOut(BaseModel):
    id: str
    name: str
    description: str
    response_kind: QuestionResponseKind
    grading_strategy: GradingStrategy
    is_builtin: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime


class QuestionCreate(BaseModel):
    course_id: str = Field(min_length=1, max_length=80)
    knowledge_point_id: str | None = Field(default=None, max_length=80)
    question_type_id: str = Field(min_length=1, max_length=36)
    prompt: str = Field(min_length=1, max_length=4_000)
    options: list[str] = Field(default_factory=list, max_length=12)
    correct_answer: Any = None
    keywords: list[str] = Field(default_factory=list, max_length=12)
    explanation: str = Field(default="", max_length=4_000)
    difficulty: float = Field(default=0.5, ge=0.0, le=1.0)
    default_score: float = Field(default=5.0, gt=0.0, le=1_000.0)

    @field_validator("course_id", "knowledge_point_id", "question_type_id", "prompt", "explanation")
    @classmethod
    def _strip_question_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class QuestionUpdate(BaseModel):
    knowledge_point_id: str | None = Field(default=None, max_length=80)
    question_type_id: str | None = Field(default=None, min_length=1, max_length=36)
    prompt: str | None = Field(default=None, min_length=1, max_length=4_000)
    options: list[str] | None = Field(default=None, max_length=12)
    correct_answer: Any = None
    keywords: list[str] | None = Field(default=None, max_length=12)
    explanation: str | None = Field(default=None, max_length=4_000)
    difficulty: float | None = Field(default=None, ge=0.0, le=1.0)
    default_score: float | None = Field(default=None, gt=0.0, le=1_000.0)
    is_archived: bool | None = None

    @field_validator("knowledge_point_id", "question_type_id", "prompt", "explanation")
    @classmethod
    def _strip_question_update_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class QuestionOut(BaseModel):
    id: str
    course_id: str
    knowledge_point_id: str | None
    question_type_id: str
    question_type_name: str
    response_kind: QuestionResponseKind
    grading_strategy: GradingStrategy
    prompt: str
    options: list[str]
    correct_answer: Any = None
    keywords: list[str]
    explanation: str
    difficulty: float
    default_score: float
    is_archived: bool
    created_at: datetime
    updated_at: datetime


class ExamItemCreate(BaseModel):
    question_id: str = Field(min_length=1, max_length=36)
    points: float = Field(gt=0.0, le=1_000.0)
    position: int = Field(ge=1, le=1_000)


class ExamCreate(BaseModel):
    course_id: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=2_000)
    duration_minutes: int = Field(default=30, ge=1, le=480)
    pass_percentage: float = Field(default=60.0, ge=0.0, le=100.0)
    shuffle_questions: bool = False
    items: list[ExamItemCreate] = Field(default_factory=list, max_length=200)

    @field_validator("course_id", "title", "description")
    @classmethod
    def _strip_exam_text(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def _unique_items(self) -> "ExamCreate":
        question_ids = [item.question_id for item in self.items]
        positions = [item.position for item in self.items]
        if len(set(question_ids)) != len(question_ids):
            raise ValueError("exam question ids must be unique")
        if len(set(positions)) != len(positions):
            raise ValueError("exam positions must be unique")
        return self


class ExamUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2_000)
    duration_minutes: int | None = Field(default=None, ge=1, le=480)
    pass_percentage: float | None = Field(default=None, ge=0.0, le=100.0)
    shuffle_questions: bool | None = None
    items: list[ExamItemCreate] | None = Field(default=None, max_length=200)

    @field_validator("title", "description")
    @classmethod
    def _strip_exam_update_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def _unique_updated_items(self) -> "ExamUpdate":
        if self.items is None:
            return self
        question_ids = [item.question_id for item in self.items]
        positions = [item.position for item in self.items]
        if len(set(question_ids)) != len(question_ids):
            raise ValueError("exam question ids must be unique")
        if len(set(positions)) != len(positions):
            raise ValueError("exam positions must be unique")
        return self


class ExamItemOut(BaseModel):
    id: str
    question_id: str
    points: float
    position: int
    question: QuestionOut


class ExamOut(BaseModel):
    id: str
    course_id: str
    title: str
    description: str
    duration_minutes: int
    pass_percentage: float
    shuffle_questions: bool
    status: ExamStatus
    items: list[ExamItemOut]
    total_points: float
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None


class AttemptQuestionOut(BaseModel):
    question_id: str
    question_type_name: str
    response_kind: QuestionResponseKind
    prompt: str
    options: list[str]
    points: float
    position: int
    user_answer: Any = None
    saved_at: datetime | None = None


class AttemptOut(BaseModel):
    id: str
    exam_id: str
    learner_id: str
    exam_title: str
    status: AttemptStatus
    started_at: datetime
    expires_at: datetime
    submitted_at: datetime | None = None
    questions: list[AttemptQuestionOut]


class AnswerSaveOut(BaseModel):
    answer_id: str
    attempt_id: str
    question_id: str
    user_answer: Any = None
    saved_at: datetime


class AttemptSummaryOut(BaseModel):
    id: str
    exam_id: str
    learner_id: str
    exam_title: str
    status: AttemptStatus
    started_at: datetime
    expires_at: datetime
    submitted_at: datetime | None = None
    awarded_score: float
    max_score: float
    pending_score: float
    percentage: float
    passed: bool | None = None


class CatalogExamOut(BaseModel):
    id: str
    course_id: str
    title: str
    description: str
    duration_minutes: int
    pass_percentage: float
    question_count: int
    total_points: float
    published_at: datetime
    latest_attempt: AttemptSummaryOut | None = None


class AttemptResultAnswerOut(BaseModel):
    answer_id: str
    question_id: str
    question_type_name: str
    response_kind: QuestionResponseKind
    grading_strategy: GradingStrategy
    prompt: str
    options: list[str]
    user_answer: Any = None
    correct_answer: Any = None
    keywords: list[str]
    explanation: str
    points: float
    awarded_score: float | None = None
    is_correct: bool | None = None
    grading_status: AnswerGradingStatus
    feedback: str


class AttemptResultOut(AttemptSummaryOut):
    answers: list[AttemptResultAnswerOut]


class ManualGradeRequest(BaseModel):
    score: float = Field(ge=0.0, le=1_000.0)
    feedback: str = Field(default="", max_length=2_000)

    @field_validator("feedback")
    @classmethod
    def _strip_feedback(cls, value: str) -> str:
        return value.strip()


class ReviewQueueItemOut(BaseModel):
    answer_id: str
    attempt_id: str
    exam_id: str
    exam_title: str
    learner_id: str
    question_id: str
    prompt: str
    user_answer: Any
    reference_answer: Any = None
    points: float
    submitted_at: datetime


class AttemptStartRequest(BaseModel):
    learner_id: str = Field(min_length=1, max_length=80)

    @field_validator("learner_id")
    @classmethod
    def _strip_start_learner(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("learner id must not be blank")
        return value


class AttemptActionRequest(AttemptStartRequest):
    pass


class AnswerSaveRequest(AttemptStartRequest):
    answer: Any = None


class KnowledgeExamPerformanceOut(BaseModel):
    knowledge_point_id: str
    knowledge_point_name: str
    answered_count: int = Field(ge=0)
    average_score_ratio: float = Field(ge=0.0, le=1.0)


class ExamAnalyticsOut(BaseModel):
    learner_id: str
    course_id: str
    submitted_count: int = Field(ge=0)
    graded_count: int = Field(ge=0)
    average_percentage: float | None = Field(default=None, ge=0.0, le=100.0)
    best_percentage: float | None = Field(default=None, ge=0.0, le=100.0)
    pass_rate: float | None = Field(default=None, ge=0.0, le=1.0)
    objective_accuracy: float | None = Field(default=None, ge=0.0, le=1.0)
    pending_review_count: int = Field(ge=0)
    knowledge_points: list[KnowledgeExamPerformanceOut] = Field(default_factory=list)

