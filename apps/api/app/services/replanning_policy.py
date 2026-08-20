"""Material-change policy for deterministic study-plan replanning."""

from __future__ import annotations

from app.domain import DiagnosisResultOut, PersistedStudyPlan, StudyPlanDraft
from app.domain.replanning import (
    PlanSignatureItem,
    ReplanningDecision,
    ReplanningReasonCode,
)


class ReplanningPolicy:
    """Compare plan meaning, never volatile provenance floats or timestamps."""

    def decide(
        self,
        current: PersistedStudyPlan | None,
        candidate: StudyPlanDraft,
        diagnosis: DiagnosisResultOut,
    ) -> ReplanningDecision:
        candidate_signature = [
            PlanSignatureItem(
                knowledge_point_id=task.knowledge_point_id,
                action_type=task.action_type,
            )
            for task in sorted(candidate.tasks, key=lambda item: item.order)
        ]
        if current is None:
            return ReplanningDecision(
                should_replan=False,
                reason_codes=[ReplanningReasonCode.NO_ACTIVE_PLAN],
                candidate_signature=candidate_signature,
            )

        current_signature = [
            PlanSignatureItem(
                knowledge_point_id=task.knowledge_point_id,
                action_type=task.action_type,
            )
            for task in sorted(current.tasks, key=lambda item: item.order)
        ]
        current_ids = [item.knowledge_point_id for item in current_signature]
        candidate_ids = [item.knowledge_point_id for item in candidate_signature]
        current_actions = {item.knowledge_point_id: item.action_type for item in current_signature}
        candidate_actions = {
            item.knowledge_point_id: item.action_type for item in candidate_signature
        }
        primary_id = (
            diagnosis.primary_focus.knowledge_point_id
            if diagnosis.primary_focus is not None
            else None
        )
        current_top = current_ids[0] if current_ids else None

        reasons: list[ReplanningReasonCode] = []
        if current_top != primary_id:
            reasons.append(ReplanningReasonCode.PRIMARY_FOCUS_CHANGED)
        if any(
            current_actions[kp_id] != candidate_actions[kp_id]
            for kp_id in current_actions.keys() & candidate_actions.keys()
        ):
            reasons.append(ReplanningReasonCode.TASK_ACTION_CHANGED)
        if set(current_ids) != set(candidate_ids):
            reasons.append(ReplanningReasonCode.TASK_SET_CHANGED)
        elif current_ids != candidate_ids:
            reasons.append(ReplanningReasonCode.TASK_ORDER_CHANGED)
        if current_top is not None and current_top not in candidate_actions:
            reasons.append(ReplanningReasonCode.TOP_TASK_RESOLVED)
        if not reasons:
            reasons.append(ReplanningReasonCode.NO_MATERIAL_CHANGE)

        return ReplanningDecision(
            should_replan=reasons != [ReplanningReasonCode.NO_MATERIAL_CHANGE],
            reason_codes=reasons,
            current_plan_id=current.id,
            current_signature=current_signature,
            candidate_signature=candidate_signature,
        )
