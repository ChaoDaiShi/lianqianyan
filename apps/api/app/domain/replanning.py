"""Deterministic value objects for active study-plan replanning."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field

from app.domain.models import LearningEvidenceOut
from app.domain.planner import PersistedStudyPlan, PlannerActionType


class ReplanningReasonCode(str, Enum):
    PRIMARY_FOCUS_CHANGED = "PRIMARY_FOCUS_CHANGED"
    TASK_ACTION_CHANGED = "TASK_ACTION_CHANGED"
    TASK_SET_CHANGED = "TASK_SET_CHANGED"
    TASK_ORDER_CHANGED = "TASK_ORDER_CHANGED"
    TOP_TASK_RESOLVED = "TOP_TASK_RESOLVED"
    NO_MATERIAL_CHANGE = "NO_MATERIAL_CHANGE"
    NO_ACTIVE_PLAN = "NO_ACTIVE_PLAN"


class ReplanningStatus(str, Enum):
    NOT_NEEDED = "not_needed"
    PERFORMED = "performed"
    FAILED = "failed"


class PlanSignatureItem(BaseModel):
    knowledge_point_id: str
    action_type: PlannerActionType


class ReplanningDecision(BaseModel):
    should_replan: bool
    reason_codes: list[ReplanningReasonCode] = Field(default_factory=list)
    current_plan_id: str | None = None
    current_signature: list[PlanSignatureItem] = Field(default_factory=list)
    candidate_signature: list[PlanSignatureItem] = Field(default_factory=list)


class ReplanningTaskPreview(BaseModel):
    knowledge_point_id: str
    knowledge_point_name: str
    action_type: PlannerActionType


class ReplanningResult(BaseModel):
    status: ReplanningStatus
    performed: bool
    reason_codes: list[ReplanningReasonCode] = Field(default_factory=list)
    previous_plan_id: str | None = None
    new_plan: PersistedStudyPlan | None = None
    previous_top_task: ReplanningTaskPreview | None = None
    new_top_task: ReplanningTaskPreview | None = None


class PracticeEvaluateResponse(BaseModel):
    """Practice facts plus the independent best-effort replanning outcome."""

    evidence: LearningEvidenceOut
    mastery_before: float = Field(ge=0.0, le=1.0)
    mastery_after: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    evidence_count: int = Field(ge=0)
    message: str
    replanning: ReplanningResult
