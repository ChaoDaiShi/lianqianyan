from __future__ import annotations

from datetime import datetime

from app.domain import (
    DiagnosisResultOut,
    DiagnosisStatus,
    PersistedStudyPlan,
    PersistedStudyTask,
    PlannerActionType,
    PlannerReasonCode,
    StudyPlanDraft,
    StudyPlanStatus,
    StudyTaskDraft,
)
from app.domain.models import KnowledgePointDiagnosis
from app.domain.replanning import ReplanningReasonCode
from app.services.replanning_policy import ReplanningPolicy


def _task(kp: str, action: PlannerActionType, order: int) -> PersistedStudyTask:
    return PersistedStudyTask(
        id=f"task-{kp}",
        plan_id="plan-1",
        draft_key=f"{kp}:{action.value}",
        knowledge_point_id=kp,
        knowledge_point_name=kp,
        action_type=action,
        priority=1.0 / order,
        estimated_minutes=20,
        reason_codes=[PlannerReasonCode.PRIMARY_FOCUS],
        source_status=DiagnosisStatus.WEAK,
        source_priority_score=0.5,
        order=order,
        created_at=datetime(2026, 8, 20, 8, 0, 0),
    )


def _plan(items: list[tuple[str, PlannerActionType]]) -> PersistedStudyPlan:
    now = datetime(2026, 8, 20, 8, 0, 0)
    return PersistedStudyPlan(
        id="plan-1",
        learner_id="learner",
        course_id="course",
        status=StudyPlanStatus.ACTIVE,
        strategy="diagnosis_driven",
        generated_at=now,
        source_diagnosis_generated_at=now,
        reason_codes=[],
        created_at=now,
        updated_at=now,
        tasks=[_task(kp, action, i + 1) for i, (kp, action) in enumerate(items)],
    )


def _draft(items: list[tuple[str, PlannerActionType]]) -> StudyPlanDraft:
    now = datetime(2026, 8, 20, 9, 0, 0)
    return StudyPlanDraft(
        learner_id="learner",
        course_id="course",
        generated_at=now,
        source_diagnosis_generated_at=now,
        reason_codes=[],
        tasks=[
            StudyTaskDraft(
                draft_key=f"{kp}:{action.value}",
                knowledge_point_id=kp,
                knowledge_point_name=kp,
                action_type=action,
                priority=1.0 / (i + 1),
                estimated_minutes=20,
                reason_codes=[],
                source_status=DiagnosisStatus.DEVELOPING,
                source_priority_score=0.123456 + (i * 0.1),
                order=i + 1,
            )
            for i, (kp, action) in enumerate(items)
        ],
    )


def _diagnosis(primary: str | None) -> DiagnosisResultOut:
    point = None
    if primary:
        point = KnowledgePointDiagnosis(
            knowledge_point_id=primary,
            knowledge_point_name=primary,
            mastery_score=0.55,
            confidence=0.5,
            evidence_count=4,
            status=DiagnosisStatus.DEVELOPING,
            priority_score=0.2,
            reason_codes=[],
        )
    return DiagnosisResultOut(
        learner_id="learner",
        course_id="course",
        course_name="course",
        primary_focus=point,
        priority_interventions=[point] if point else [],
        strengths=[],
        weak_points=[],
        developing_points=[point] if point else [],
        unassessed_points=[],
        summary_codes=[],
        diagnosis_generated_at=datetime(2026, 8, 20, 9, 0, 0),
    )


def test_no_active_plan_is_not_auto_created() -> None:
    decision = ReplanningPolicy().decide(None, _draft([("a", PlannerActionType.REMEDIATE)]), _diagnosis("a"))
    assert decision.should_replan is False
    assert decision.reason_codes == [ReplanningReasonCode.NO_ACTIVE_PLAN]
    assert decision.current_plan_id is None


def test_same_signature_ignores_provenance_float_changes() -> None:
    current = _plan([("a", PlannerActionType.REMEDIATE), ("b", PlannerActionType.ASSESS)])
    candidate = _draft([("a", PlannerActionType.REMEDIATE), ("b", PlannerActionType.ASSESS)])
    decision = ReplanningPolicy().decide(current, candidate, _diagnosis("a"))
    assert decision.should_replan is False
    assert decision.reason_codes == [ReplanningReasonCode.NO_MATERIAL_CHANGE]


def test_action_change_is_material_and_deterministic() -> None:
    current = _plan([("a", PlannerActionType.REMEDIATE), ("b", PlannerActionType.ASSESS)])
    candidate = _draft([("a", PlannerActionType.STRENGTHEN), ("b", PlannerActionType.ASSESS)])
    first = ReplanningPolicy().decide(current, candidate, _diagnosis("a"))
    second = ReplanningPolicy().decide(current, candidate, _diagnosis("a"))
    assert first == second
    assert first.should_replan is True
    assert first.reason_codes == [ReplanningReasonCode.TASK_ACTION_CHANGED]


def test_set_order_focus_and_resolved_reasons_are_explainable() -> None:
    policy = ReplanningPolicy()
    current = _plan([("a", PlannerActionType.REMEDIATE), ("b", PlannerActionType.ASSESS)])

    changed_set = policy.decide(
        current,
        _draft([("b", PlannerActionType.ASSESS), ("c", PlannerActionType.STRENGTHEN)]),
        _diagnosis("b"),
    )
    assert changed_set.reason_codes == [
        ReplanningReasonCode.PRIMARY_FOCUS_CHANGED,
        ReplanningReasonCode.TASK_SET_CHANGED,
        ReplanningReasonCode.TOP_TASK_RESOLVED,
    ]

    changed_order = policy.decide(
        current,
        _draft([("b", PlannerActionType.ASSESS), ("a", PlannerActionType.REMEDIATE)]),
        _diagnosis("b"),
    )
    assert changed_order.reason_codes == [
        ReplanningReasonCode.PRIMARY_FOCUS_CHANGED,
        ReplanningReasonCode.TASK_ORDER_CHANGED,
    ]
