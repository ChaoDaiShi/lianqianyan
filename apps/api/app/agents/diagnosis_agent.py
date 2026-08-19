from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.agents.base import AgentCapability, AgentRequest, AgentResult
from app.domain import Course
from app.services.diagnosis_service import DiagnosisService
from app.services.learner_profile_service import LearnerProfileService


class DiagnosisAgent:
    """Read-only capability boundary around the accepted diagnosis services."""

    def __init__(
        self,
        db: Session,
        profile_service: LearnerProfileService | None = None,
        diagnosis_service: DiagnosisService | None = None,
    ) -> None:
        self._db = db
        self._profile = profile_service or LearnerProfileService(db)
        self._diagnosis = diagnosis_service or DiagnosisService(db)

    def run(self, request: AgentRequest) -> AgentResult:
        course = self._db.get(Course, request.course_id)
        course_name = course.name if course is not None else request.course_id
        profile = self._profile.build_profile(
            request.learner_id,
            request.course_id,
            course_name,
        )
        diagnosis = self._diagnosis.build_from_profile(profile)
        primary = diagnosis.primary_focus
        summary = (
            f"当前优先关注「{primary.knowledge_point_name}」"
            if primary is not None
            else "目前还没有足够记录判断明确的优先知识点"
        )
        return AgentResult(
            agent=AgentCapability.DIAGNOSIS,
            summary=summary,
            data={"profile": profile.model_dump(mode="json"), "diagnosis": diagnosis.model_dump(mode="json")},
            context_used=["profile", "diagnosis"],
            suggested_actions=(
                [{"type": "open_diagnosis", "label": "查看学习诊断"}]
                if primary is not None
                else []
            ),
        )
