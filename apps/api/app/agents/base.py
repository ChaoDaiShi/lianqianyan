from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class AgentCapability(str, Enum):
    DIAGNOSIS = "diagnosis"
    PLANNING = "planning"
    TUTORING = "tutoring"
    ASSESSMENT = "assessment"


class AgentRequest(BaseModel):
    learner_id: str = Field(min_length=1)
    course_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    capability: AgentCapability | None = None

    @field_validator("learner_id", "course_id", "message")
    @classmethod
    def strip_and_reject_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class AgentTraceItem(BaseModel):
    agent: AgentCapability
    label: str
    status: str = "completed"


class AgentResult(BaseModel):
    agent: AgentCapability
    success: bool = True
    summary: str = ""
    data: dict[str, Any] = Field(default_factory=dict)
    suggested_actions: list[dict[str, str]] = Field(default_factory=list)
    context_used: list[str] = Field(default_factory=list)
    provider: str = "none"
    response_mode: str = "provider"


class AgentsChatResponse(BaseModel):
    answer: str
    selected_capability: AgentCapability
    provider: str = "none"
    response_mode: str = "provider"
    context_used: list[str] = Field(default_factory=list)
    suggested_actions: list[dict[str, str]] = Field(default_factory=list)
    agent_trace: list[AgentTraceItem] = Field(default_factory=list)
