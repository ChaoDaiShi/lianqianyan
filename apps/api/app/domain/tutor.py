from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class TutorConversationRequest(BaseModel):
    learner_id: str = Field(min_length=1)
    course_id: str = Field(min_length=1)
    message: str = Field(min_length=1)

    @field_validator("learner_id", "course_id", "message")
    @classmethod
    def _strip_and_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class TutorResponse(BaseModel):
    answer: str
    context_used: list[str] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)
    source: Literal["llm", "fallback"] = "llm"
    provider: str = "mock"
    response_mode: Literal["provider", "fallback"] = "provider"


class TutorProfilePointContext(BaseModel):
    knowledge_point_id: str
    knowledge_point_name: str
    mastery_score: float
    status: str


class TutorProfileContext(BaseModel):
    overall_mastery: float | None = None
    overall_confidence: float | None = None
    coverage: float = 0.0
    assessed_count: int = 0
    total_knowledge_points: int = 0
    insufficient_data: bool = True
    points: list[TutorProfilePointContext] = Field(default_factory=list)


class TutorDiagnosisPointContext(BaseModel):
    knowledge_point_id: str
    knowledge_point_name: str
    mastery_score: float
    status: str
    priority_score: float = 0.0


class TutorDiagnosisContext(BaseModel):
    primary_focus: TutorDiagnosisPointContext | None = None
    weak_points: list[TutorDiagnosisPointContext] = Field(default_factory=list)
    developing_points: list[TutorDiagnosisPointContext] = Field(default_factory=list)
    strengths: list[TutorDiagnosisPointContext] = Field(default_factory=list)
    unassessed_points: list[TutorDiagnosisPointContext] = Field(default_factory=list)


class TutorPlanTaskContext(BaseModel):
    order: int
    knowledge_point_id: str
    knowledge_point_name: str
    action_type: str
    estimated_minutes: int


class TutorPlanContext(BaseModel):
    has_plan: bool = False
    plan_id: str | None = None
    generated_at: datetime | None = None
    tasks: list[TutorPlanTaskContext] = Field(default_factory=list)


class TutorEvidenceContext(BaseModel):
    evidence_type: str
    knowledge_point_id: str | None = None
    is_assessment: bool = False
    occurred_at: datetime
    is_correct: bool | None = None
    score: float | None = None
    difficulty: float | None = None
    mastery_before: float | None = None
    mastery_after: float | None = None
    confidence: float | None = None
    evidence_count: int | None = None


class TutorContext(BaseModel):
    learner_id: str
    course_id: str
    course_name: str
    profile: TutorProfileContext | None = None
    diagnosis: TutorDiagnosisContext | None = None
    plan: TutorPlanContext = Field(default_factory=TutorPlanContext)
    recent_evidence: list[TutorEvidenceContext] = Field(default_factory=list)
    context_used: list[str] = Field(default_factory=list)
