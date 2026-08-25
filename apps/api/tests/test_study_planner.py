"""Phase 2D-0 Study Planner 测试 —— 覆盖 Diagnosis → PlannerAction → StudyPlanDraft 的确定性规则。

约定：
- Planner 只消费 DiagnosisResult（绝不自行查询 Mastery 再重新诊断）。
- UNASSESSED ≠ WEAK：未评估 → ASSESS（先诊断），绝不 REMEDIATE。
- 排序：Action Tier → primary_focus → priority_score 降序 → 稳定序。
- 相同输入必须产生相同 Plan（确定性）。
"""

from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from tests.seed_fixtures import TEST_LEARNER_ID, seed_test_data
from app.db.session import SessionLocal, engine
from app.domain import (
    Base,
    DiagnosisReasonCode,
    DiagnosisResultOut,
    DiagnosisStatus,
    PlannerActionType,
    PlannerReasonCode,
    PlanStrategy,
)
from app.domain.models import KnowledgePoint, KnowledgePointDiagnosis, MasteryRecord
from app.main import create_app
from app.services.diagnosis_service import DiagnosisService
from app.services.study_planner_policy import PlannerConfig, StudyPlannerPolicy
from app.services.study_planner_service import StudyPlannerService

LEARNER = TEST_LEARNER_ID
COURSE = "course-os"


@pytest.fixture()
def client() -> TestClient:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_test_data(db)
    with TestClient(create_app()) as c:
        yield c


def _db() -> SessionLocal:
    return SessionLocal()


def _policy(config: PlannerConfig | None = None) -> StudyPlannerPolicy:
    return StudyPlannerPolicy(config)


def _add_course(db, course_id: str, kps: list[str]) -> None:
    for kp_id in kps:
        db.add(KnowledgePoint(id=kp_id, name=kp_id, course_id=course_id, difficulty=1))


def _add_masteries(db, learner: str, rows: list[tuple[str, float, float, int]]) -> None:
    for kp_id, mastery, confidence, count in rows:
        db.add(
            MasteryRecord(
                id=kp_id,
                learner_id=learner,
                knowledge_point_id=kp_id,
                mastery_score=mastery,
                confidence=confidence,
                evidence_count=count,
            )
        )


def _diagnose(learner: str, course_id: str) -> DiagnosisResultOut:
    with _db() as db:
        return DiagnosisService(db).diagnose_learner_course(learner, course_id, course_id)


def _plan(learner: str, course_id: str, result: DiagnosisResultOut | None = None):
    return StudyPlannerService().generate_from_diagnosis(
        learner, course_id, result or _diagnose(learner, course_id)
    )


def _mk_kpd(
    kp_id: str,
    status: DiagnosisStatus,
    mastery: float = 0.5,
    confidence: float = 0.5,
    evidence_count: int = 5,
    priority: float = 0.0,
) -> KnowledgePointDiagnosis:
    return KnowledgePointDiagnosis(
        knowledge_point_id=kp_id,
        knowledge_point_name=kp_id,
        mastery_score=mastery,
        confidence=confidence,
        evidence_count=evidence_count,
        status=status,
        priority_score=priority,
    )


def _manual_result(
    *,
    weak: list[KnowledgePointDiagnosis] | None = None,
    developing: list[KnowledgePointDiagnosis] | None = None,
    strengths: list[KnowledgePointDiagnosis] | None = None,
    unassessed: list[KnowledgePointDiagnosis] | None = None,
    primary_focus: KnowledgePointDiagnosis | None = None,
) -> DiagnosisResultOut:
    return DiagnosisResultOut(
        learner_id="manual-user",
        course_id="manual-course",
        course_name="manual-course",
        primary_focus=primary_focus,
        priority_interventions=[],
        strengths=strengths or [],
        weak_points=weak or [],
        developing_points=developing or [],
        unassessed_points=unassessed or [],
        summary_codes=[],
        diagnosis_generated_at=datetime(2026, 8, 14, 12, 0, 0),
    )


# ---------------------------------------------------------------------------
# Test A-F：DiagnosisStatus → PlannerActionType 集中映射（Policy 层）
# ---------------------------------------------------------------------------


def test_weak_maps_to_remediate() -> None:
    # Test A：WEAK → REMEDIATE
    assert _policy().action_for(DiagnosisStatus.WEAK) == PlannerActionType.REMEDIATE


def test_developing_maps_to_strengthen() -> None:
    # Test B：DEVELOPING → STRENGTHEN
    assert _policy().action_for(DiagnosisStatus.DEVELOPING) == PlannerActionType.STRENGTHEN


def test_unassessed_maps_to_assess_not_remediate() -> None:
    # Test C：UNASSESSED → ASSESS，绝不 REMEDIATE（未知 ≠ 薄弱）
    assert _policy().action_for(DiagnosisStatus.UNASSESSED) == PlannerActionType.ASSESS
    assert _policy().action_for(DiagnosisStatus.UNASSESSED) != PlannerActionType.REMEDIATE


def test_insufficient_evidence_maps_to_assess() -> None:
    # Test D：INSUFFICIENT_EVIDENCE → ASSESS
    assert (
        _policy().action_for(DiagnosisStatus.INSUFFICIENT_EVIDENCE)
        == PlannerActionType.ASSESS
    )


def test_proficient_maps_to_review() -> None:
    # Test E：PROFICIENT → REVIEW
    assert _policy().action_for(DiagnosisStatus.PROFICIENT) == PlannerActionType.REVIEW


def test_mastered_not_scheduled() -> None:
    # Test F：MASTERED 默认不进入短期补强计划
    assert _policy().action_for(DiagnosisStatus.MASTERED) is None
    assert not _policy().is_planning_eligible(DiagnosisStatus.MASTERED)


# ---------------------------------------------------------------------------
# Service 层：状态 → 动作（真实 Diagnosis → Draft）
# ---------------------------------------------------------------------------


def test_service_weak_produces_remediate_task(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-a", ["kp-a1"])
        _add_masteries(db, "user-a", [("kp-a1", 0.40, 0.50, 5)])
        db.commit()
    draft = _plan("user-a", "course-a")
    assert [t.action_type for t in draft.tasks] == [PlannerActionType.REMEDIATE]
    assert draft.tasks[0].knowledge_point_id == "kp-a1"
    assert draft.tasks[0].source_status == DiagnosisStatus.WEAK


def test_service_unassessed_produces_assess_task(client: TestClient) -> None:
    # 无任何 Mastery 记录 → UNASSESSED → ASSESS（先快速诊断，不安排 35 分钟补习）
    with _db() as db:
        _add_course(db, "course-c", ["kp-c1"])
        db.commit()
    draft = _plan("user-c", "course-c")
    assert [t.action_type for t in draft.tasks] == [PlannerActionType.ASSESS]
    assert draft.tasks[0].source_status == DiagnosisStatus.UNASSESSED


def test_service_insufficient_produces_assess_task(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-d", ["kp-d1"])
        _add_masteries(db, "user-d", [("kp-d1", 0.05, 0.05, 3)])  # 低置信 → INSUFFICIENT
        db.commit()
    draft = _plan("user-d", "course-d")
    assert [t.action_type for t in draft.tasks] == [PlannerActionType.ASSESS]
    assert draft.tasks[0].source_status == DiagnosisStatus.INSUFFICIENT_EVIDENCE


def test_service_proficient_produces_review_task(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-e", ["kp-e1"])
        _add_masteries(db, "user-e", [("kp-e1", 0.78, 0.60, 6)])
        db.commit()
    draft = _plan("user-e", "course-e")
    assert [t.action_type for t in draft.tasks] == [PlannerActionType.REVIEW]
    assert draft.tasks[0].source_status == DiagnosisStatus.PROFICIENT


def test_service_mastered_excluded_from_plan(client: TestClient) -> None:
    # MASTERED 知识点的学习优先级低于薄弱内容 → 不进入短期计划
    with _db() as db:
        _add_course(db, "course-f", ["kp-f-mastered", "kp-f-weak"])
        _add_masteries(
            db,
            "user-f",
            [
                ("kp-f-mastered", 0.95, 0.80, 10),  # MASTERED
                ("kp-f-weak", 0.40, 0.50, 5),  # WEAK
            ],
        )
        db.commit()
    draft = _plan("user-f", "course-f")
    kp_ids = [t.knowledge_point_id for t in draft.tasks]
    assert "kp-f-weak" in kp_ids
    assert "kp-f-mastered" not in kp_ids


# ---------------------------------------------------------------------------
# Test G：primary_focus 必须成为最高合法补强任务
# ---------------------------------------------------------------------------


def test_primary_focus_is_first_remediation_task(client: TestClient) -> None:
    # 真实链路：WEAK 是 primary_focus（最高 priority）→ 第一条任务 = primary_focus
    with _db() as db:
        _add_course(db, "course-g", ["kp-g1", "kp-g2"])
        _add_masteries(
            db,
            "user-g",
            [
                ("kp-g1", 0.30, 0.50, 5),  # WEAK, priority=(0.70*0.50)=0.35
                ("kp-g2", 0.40, 0.50, 5),  # WEAK, priority=(0.60*0.50)=0.30
            ],
        )
        db.commit()
    result = _diagnose("user-g", "course-g")
    assert result.primary_focus is not None
    assert result.primary_focus.knowledge_point_id == "kp-g1"
    draft = _plan("user-g", "course-g", result)
    assert draft.tasks[0].knowledge_point_id == "kp-g1"
    assert draft.tasks[0].action_type == PlannerActionType.REMEDIATE
    assert PlannerReasonCode.PRIMARY_FOCUS in draft.tasks[0].reason_codes
    assert PlannerReasonCode.CONFIRMED_WEAKNESS in draft.tasks[0].reason_codes


def test_primary_focus_boost_wins_within_tier() -> None:
    # 防御性：即使 primary_focus 的 priority_score 不是同层最高，
    # primary_focus 仍必须排在其 Action Tier 首位（尊重 Diagnosis 焦点）。
    result = _manual_result(
        developing=[
            _mk_kpd("kp-a", DiagnosisStatus.DEVELOPING, priority=0.90),
            _mk_kpd("kp-b", DiagnosisStatus.DEVELOPING, priority=0.10),
        ],
        primary_focus=_mk_kpd("kp-b", DiagnosisStatus.DEVELOPING, priority=0.10),
    )
    draft = _plan("manual-user", "manual-course", result)
    assert [t.knowledge_point_id for t in draft.tasks] == ["kp-b", "kp-a"]
    assert draft.tasks[0].action_type == PlannerActionType.STRENGTHEN


# ---------------------------------------------------------------------------
# Test H：同层排序 —— 两个 WEAK，高 priority 在前
# ---------------------------------------------------------------------------


def test_weak_higher_priority_first(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-h", ["kp-h1", "kp-h2"])
        _add_masteries(
            db,
            "user-h",
            [
                ("kp-h1", 0.30, 0.50, 5),  # priority = 0.35
                ("kp-h2", 0.40, 0.50, 5),  # priority = 0.30
            ],
        )
        db.commit()
    draft = _plan("user-h", "course-h")
    assert draft.tasks[0].knowledge_point_id == "kp-h1"
    assert draft.tasks[1].knowledge_point_id == "kp-h2"
    assert draft.tasks[0].source_priority_score > draft.tasks[1].source_priority_score


# ---------------------------------------------------------------------------
# Test I：全部 UNASSESSED → 生成 ASSESS Tasks（不是空计划，不是补弱）
# ---------------------------------------------------------------------------


def test_all_unassessed_produces_assess_tasks(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-i", ["kp-i1", "kp-i2"])
        db.commit()
    draft = _plan("user-i", "course-i")
    assert len(draft.tasks) == 2
    assert all(t.action_type == PlannerActionType.ASSESS for t in draft.tasks)
    assert all(
        PlannerReasonCode.NEEDS_ASSESSMENT in t.reason_codes for t in draft.tasks
    )
    assert all(t.source_status == DiagnosisStatus.UNASSESSED for t in draft.tasks)


def test_all_insufficient_produces_assess_tasks(client: TestClient) -> None:
    # 全部证据不足 → 先评估，而不是补弱
    with _db() as db:
        _add_course(db, "course-i2", ["kp-i2a", "kp-i2b"])
        _add_masteries(
            db,
            "user-i2",
            [
                ("kp-i2a", 0.10, 0.05, 3),
                ("kp-i2b", 0.20, 0.05, 3),
            ],
        )
        db.commit()
    draft = _plan("user-i2", "course-i2")
    assert len(draft.tasks) == 2
    assert all(t.action_type == PlannerActionType.ASSESS for t in draft.tasks)


# ---------------------------------------------------------------------------
# Test J：全部 MASTERED → tasks=[] + NO_IMMEDIATE_INTERVENTION
# ---------------------------------------------------------------------------


def test_all_mastered_empty_plan(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-j", ["kp-j1", "kp-j2"])
        _add_masteries(
            db,
            "user-j",
            [
                ("kp-j1", 0.95, 0.80, 10),
                ("kp-j2", 0.90, 0.80, 10),
            ],
        )
        db.commit()
    draft = _plan("user-j", "course-j")
    assert draft.tasks == []
    assert draft.reason_codes == [PlannerReasonCode.NO_IMMEDIATE_INTERVENTION]


def test_empty_diagnosis_empty_plan() -> None:
    # 无任何知识点：同样返回空计划（不强行造任务）
    draft = _plan("user-j2", "course-none", _manual_result())
    assert draft.tasks == []
    assert draft.reason_codes == [PlannerReasonCode.NO_IMMEDIATE_INTERVENTION]


# ---------------------------------------------------------------------------
# Test K：确定性 —— 相同输入两次生成顺序一致
# ---------------------------------------------------------------------------


def test_same_input_same_order(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-k", ["kp-k1", "kp-k2", "kp-k3", "kp-k4", "kp-k5"])
        _add_masteries(
            db,
            "user-k",
            [
                ("kp-k1", 0.30, 0.50, 5),  # WEAK
                ("kp-k2", 0.55, 0.50, 4),  # DEVELOPING
                ("kp-k3", 0.78, 0.60, 6),  # PROFICIENT
                ("kp-k4", 0.95, 0.80, 10),  # MASTERED
                # kp-k5 无记录 → UNASSESSED
            ],
        )
        db.commit()
    result = _diagnose("user-k", "course-k")
    plan_a = _plan("user-k", "course-k", result)
    plan_b = _plan("user-k", "course-k", result)
    assert [t.draft_key for t in plan_a.tasks] == [t.draft_key for t in plan_b.tasks]
    assert [t.order for t in plan_a.tasks] == [t.order for t in plan_b.tasks]
    assert plan_a.strategy == plan_b.strategy == PlanStrategy.DIAGNOSIS_DRIVEN


# ---------------------------------------------------------------------------
# Test L：MAX_TASKS 截断（集中配置）
# ---------------------------------------------------------------------------


def test_max_tasks_truncates_default(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-l", ["kp-l1", "kp-l2", "kp-l3", "kp-l4"])
        _add_masteries(
            db,
            "user-l",
            [
                ("kp-l1", 0.30, 0.50, 5),
                ("kp-l2", 0.35, 0.50, 5),
                ("kp-l3", 0.32, 0.50, 5),
                ("kp-l4", 0.33, 0.50, 5),
            ],
        )
        db.commit()
    draft = _plan("user-l", "course-l")
    assert len(draft.tasks) == PlannerConfig().MAX_TASKS == 3


def test_max_tasks_respects_custom_config(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-l2", ["kp-l2a", "kp-l2b", "kp-l2c"])
        _add_masteries(
            db,
            "user-l2",
            [
                ("kp-l2a", 0.30, 0.50, 5),
                ("kp-l2b", 0.35, 0.50, 5),
                ("kp-l2c", 0.32, 0.50, 5),
            ],
        )
        db.commit()
    result = _diagnose("user-l2", "course-l2")
    service = StudyPlannerService(_policy(PlannerConfig(MAX_TASKS=2)))
    draft = service.generate_from_diagnosis("user-l2", "course-l2", result)
    assert len(draft.tasks) == 2


# ---------------------------------------------------------------------------
# Test M：estimated_minutes 由集中 Duration Policy 产生
# ---------------------------------------------------------------------------


def test_duration_policy_centralized() -> None:
    p = _policy()
    assert p.minutes_for(PlannerActionType.ASSESS) == 15
    assert p.minutes_for(PlannerActionType.REMEDIATE) == 35
    assert p.minutes_for(PlannerActionType.STRENGTHEN) == 25
    assert p.minutes_for(PlannerActionType.REVIEW) == 15
    assert p.config.ASSESS_MINUTES == 15
    assert p.config.REMEDIATE_MINUTES == 35
    assert p.config.STRENGTHEN_MINUTES == 25
    assert p.config.REVIEW_MINUTES == 15


def test_tasks_carry_duration_from_policy(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-m", ["kp-m1", "kp-m2", "kp-m3", "kp-m4"])
        _add_masteries(
            db,
            "user-m",
            [
                ("kp-m1", 0.40, 0.50, 5),  # WEAK → 35
                ("kp-m2", 0.60, 0.50, 4),  # DEVELOPING → 25
                ("kp-m3", 0.78, 0.60, 6),  # PROFICIENT → 15
                # kp-m4 无记录 → UNASSESSED → 15
            ],
        )
        db.commit()
    result = _diagnose("user-m", "course-m")
    # MAX_TASKS=4 确保 4 种状态全部进入计划，逐一校验 Duration
    service = StudyPlannerService(_policy(PlannerConfig(MAX_TASKS=4)))
    draft = service.generate_from_diagnosis("user-m", "course-m", result)
    by_id = {t.knowledge_point_id: t for t in draft.tasks}
    assert by_id["kp-m1"].estimated_minutes == 35
    assert by_id["kp-m2"].estimated_minutes == 25
    assert by_id["kp-m3"].estimated_minutes == 15
    assert by_id["kp-m4"].estimated_minutes == 15


# ---------------------------------------------------------------------------
# Test N：reason_codes —— WEAK / UNASSESSED 等产生正确 Planner Reason
# ---------------------------------------------------------------------------


def test_reason_codes_by_status() -> None:
    p = _policy()
    assert p.reason_codes_for(DiagnosisStatus.WEAK) == [
        PlannerReasonCode.CONFIRMED_WEAKNESS
    ]
    assert p.reason_codes_for(DiagnosisStatus.UNASSESSED) == [
        PlannerReasonCode.NEEDS_ASSESSMENT
    ]
    assert p.reason_codes_for(DiagnosisStatus.INSUFFICIENT_EVIDENCE) == [
        PlannerReasonCode.NEEDS_MORE_EVIDENCE
    ]
    assert p.reason_codes_for(DiagnosisStatus.DEVELOPING) == [
        PlannerReasonCode.NEEDS_STRENGTHENING
    ]
    assert p.reason_codes_for(DiagnosisStatus.PROFICIENT) == [
        PlannerReasonCode.MAINTENANCE_REVIEW
    ]
    # primary_focus 前置 PRIMARY_FOCUS
    assert p.reason_codes_for(DiagnosisStatus.WEAK, is_primary_focus=True) == [
        PlannerReasonCode.PRIMARY_FOCUS,
        PlannerReasonCode.CONFIRMED_WEAKNESS,
    ]


# ---------------------------------------------------------------------------
# 分层：REMEDIATE < ASSESS < STRENGTHEN < REVIEW（集中定义、有测试）
# ---------------------------------------------------------------------------


def test_action_tier_ordering() -> None:
    p = _policy()
    assert p.tier_for(PlannerActionType.REMEDIATE) < p.tier_for(PlannerActionType.ASSESS)
    assert p.tier_for(PlannerActionType.ASSESS) < p.tier_for(PlannerActionType.STRENGTHEN)
    assert p.tier_for(PlannerActionType.STRENGTHEN) < p.tier_for(PlannerActionType.REVIEW)


def test_plan_respects_tier_order(client: TestClient) -> None:
    # 混合状态：WEAK 先于 UNASSESSED 先于 DEVELOPING 先于 PROFICIENT
    with _db() as db:
        _add_course(db, "course-tier", ["kp-t1", "kp-t2", "kp-t3", "kp-t4"])
        _add_masteries(
            db,
            "user-tier",
            [
                ("kp-t1", 0.40, 0.50, 5),  # WEAK → REMEDIATE (Tier 1)
                ("kp-t3", 0.60, 0.50, 4),  # DEVELOPING → STRENGTHEN (Tier 3)
                ("kp-t4", 0.78, 0.60, 6),  # PROFICIENT → REVIEW (Tier 4)
                # kp-t2 无记录 → UNASSESSED → ASSESS (Tier 2)
            ],
        )
        db.commit()
    result = _diagnose("user-tier", "course-tier")
    service = StudyPlannerService(_policy(PlannerConfig(MAX_TASKS=4)))
    draft = service.generate_from_diagnosis("user-tier", "course-tier", result)
    assert [t.knowledge_point_id for t in draft.tasks] == [
        "kp-t1", "kp-t2", "kp-t3", "kp-t4",
    ]
    assert [t.action_type for t in draft.tasks] == [
        PlannerActionType.REMEDIATE,
        PlannerActionType.ASSESS,
        PlannerActionType.STRENGTHEN,
        PlannerActionType.REVIEW,
    ]


# ---------------------------------------------------------------------------
# 其他 Draft 语义
# ---------------------------------------------------------------------------


def test_task_priority_is_planner_order_result(client: TestClient) -> None:
    # priority 是 Planner 排序结果（首个任务 = 1.0，依次递减），不是来源 priority_score
    with _db() as db:
        _add_course(db, "course-p", ["kp-p1", "kp-p2", "kp-p3"])
        _add_masteries(
            db,
            "user-p",
            [
                ("kp-p1", 0.30, 0.50, 5),
                ("kp-p2", 0.55, 0.50, 4),
                # kp-p3 无记录 → UNASSESSED
            ],
        )
        db.commit()
    draft = _plan("user-p", "course-p")
    assert len(draft.tasks) == 3
    assert draft.tasks[0].priority == pytest.approx(1.0)
    assert draft.tasks[1].priority < draft.tasks[0].priority
    assert draft.tasks[2].priority < draft.tasks[1].priority
    assert [t.order for t in draft.tasks] == [1, 2, 3]


def test_draft_key_is_stable() -> None:
    result = _manual_result(
        weak=[_mk_kpd("kp-x", DiagnosisStatus.WEAK, priority=0.5)]
    )
    plan_a = _plan("u", "c", result)
    plan_b = _plan("u", "c", result)
    assert plan_a.tasks[0].draft_key == plan_b.tasks[0].draft_key
    assert plan_a.tasks[0].draft_key == "kp-x:remediate"


# ---------------------------------------------------------------------------
# Test O：真实 Demo Diagnosis → 合理 StudyPlanDraft
# ---------------------------------------------------------------------------


def test_demo_draft_matches_primary_focus(client: TestClient) -> None:
    result = _diagnose(LEARNER, COURSE)
    # 前置校验：Demo 真实状态
    assert result.primary_focus is not None
    assert result.primary_focus.knowledge_point_id == "kp-deadlock"
    assert result.primary_focus.status == DiagnosisStatus.WEAK

    draft = _plan(LEARNER, COURSE, result)
    assert len(draft.tasks) == 3
    assert draft.strategy == PlanStrategy.DIAGNOSIS_DRIVEN

    # Task 1：primary_focus（死锁）→ REMEDIATE（不是 PV，不是 Mock）
    t1 = draft.tasks[0]
    assert t1.knowledge_point_id == "kp-deadlock"
    assert t1.action_type == PlannerActionType.REMEDIATE
    assert t1.source_status == DiagnosisStatus.WEAK
    assert PlannerReasonCode.PRIMARY_FOCUS in t1.reason_codes
    assert PlannerReasonCode.CONFIRMED_WEAKNESS in t1.reason_codes

    # Task 2：未评估（进程调度）→ ASSESS，绝不 REMEDIATE
    t2 = draft.tasks[1]
    assert t2.knowledge_point_id == "kp-scheduling"
    assert t2.action_type == PlannerActionType.ASSESS
    assert PlannerReasonCode.NEEDS_ASSESSMENT in t2.reason_codes

    # Task 3：某 DEVELOPING → STRENGTHEN（进程同步 priority 0.2 > PV 0.105）
    t3 = draft.tasks[2]
    assert t3.action_type == PlannerActionType.STRENGTHEN
    assert t3.source_status == DiagnosisStatus.DEVELOPING
    assert t3.knowledge_point_id == "kp-process-sync"

    # 顺序总校验：REMEDIATE < ASSESS < STRENGTHEN
    assert draft.tasks[0].order < draft.tasks[1].order < draft.tasks[2].order


def test_demo_draft_semantics_not_weak_for_unassessed(client: TestClient) -> None:
    # 进程调度没有任何评估 → 计划里必须是 ASSESS，绝不能是 REMEDIATE 补习
    draft = _plan(LEARNER, COURSE)
    scheduling = next(t for t in draft.tasks if t.knowledge_point_id == "kp-scheduling")
    assert scheduling.action_type == PlannerActionType.ASSESS
    assert scheduling.action_type != PlannerActionType.REMEDIATE
    assert scheduling.estimated_minutes == 15
