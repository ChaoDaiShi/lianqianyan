"""Synchronous deterministic replanning orchestration."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain import Course
from app.domain.replanning import (
    ReplanningReasonCode,
    ReplanningResult,
    ReplanningStatus,
    ReplanningTaskPreview,
)
from app.services.diagnosis_service import DiagnosisService
from app.services.replanning_policy import ReplanningPolicy
from app.services.study_plan_lifecycle_service import StudyPlanLifecycleService
from app.services.study_planner_service import StudyPlannerService


class DynamicReplanningService:
    """Recompute diagnosis and replace the plan only for a material signature change."""

    def __init__(
        self,
        db: Session,
        lifecycle: StudyPlanLifecycleService | None = None,
        diagnosis_service: DiagnosisService | None = None,
        planner_service: StudyPlannerService | None = None,
        policy: ReplanningPolicy | None = None,
    ) -> None:
        self._db = db
        self._lifecycle = lifecycle or StudyPlanLifecycleService(db)
        self._diagnosis = diagnosis_service or DiagnosisService(db)
        self._planner = planner_service or StudyPlannerService()
        self._policy = policy or ReplanningPolicy()

    def replan(self, learner_id: str, course_id: str) -> ReplanningResult:
        current = self._lifecycle.get_current_plan(learner_id, course_id)
        if current is None:
            return ReplanningResult(
                status=ReplanningStatus.NOT_NEEDED,
                performed=False,
                reason_codes=[ReplanningReasonCode.NO_ACTIVE_PLAN],
            )

        diagnosis = self._diagnosis.diagnose_learner_course(
            learner_id, course_id, self._resolve_course_name(course_id)
        )
        candidate = self._planner.generate_from_diagnosis(
            learner_id, course_id, diagnosis
        )
        decision = self._policy.decide(current, candidate, diagnosis)
        previous_top = self._preview(current.tasks[0]) if current.tasks else None
        if not decision.should_replan:
            return ReplanningResult(
                status=ReplanningStatus.NOT_NEEDED,
                performed=False,
                reason_codes=decision.reason_codes,
                previous_plan_id=current.id,
                previous_top_task=previous_top,
            )

        new_plan = self._lifecycle.replace_active_plan(candidate)
        return ReplanningResult(
            status=ReplanningStatus.PERFORMED,
            performed=True,
            reason_codes=decision.reason_codes,
            previous_plan_id=current.id,
            new_plan=new_plan,
            previous_top_task=previous_top,
            new_top_task=self._preview(new_plan.tasks[0]) if new_plan.tasks else None,
        )

    @staticmethod
    def _preview(task) -> ReplanningTaskPreview:
        return ReplanningTaskPreview(
            knowledge_point_id=task.knowledge_point_id,
            knowledge_point_name=task.knowledge_point_name,
            action_type=task.action_type,
        )

    def _resolve_course_name(self, course_id: str) -> str:
        course = self._db.scalar(select(Course).where(Course.id == course_id))
        return course.name if course is not None else course_id
