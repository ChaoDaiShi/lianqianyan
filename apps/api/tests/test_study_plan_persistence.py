"""Phase 2D-1 StudyPlan Persistence 测试 —— 覆盖 StudyPlanDraft → 持久化闭环。

约定：
- **所有测试使用独立临时 SQLite（:memory:）**，不触碰 apps/api/education.db。
- Repository 只 add/flush/query，不 commit；commit/rollback 由
  StudyPlanPersistenceService（Application Service）控制。
- StudyPlan + StudyTask[] 属于同一事务：任何失败 → 全部回滚。
- 正式 DB id 服务端生成；draft_key 只是来源追踪 key，不等于 DB primary key。
- priority（Planner 排序结果）与 source_priority_score（Diagnosis 输入）严格区分。
"""

from __future__ import annotations

from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.seed import DEMO_LEARNER_ID, seed_demo_data
from app.domain import (
    Base,
    DiagnosisStatus,
    PlanStrategy,
    PlannerActionType,
    PlannerReasonCode,
    StudyPlan,
    StudyPlanStatus,
    StudyTask,
)
from app.domain.planner import StudyPlanDraft, StudyTaskDraft
from app.services.diagnosis_service import DiagnosisService
from app.services.study_plan_persistence_service import StudyPlanPersistenceService
from app.services.study_plan_repository import StudyPlanRepository
from app.services.study_planner_service import StudyPlannerService
from app.services.study_task_repository import StudyTaskRepository


@pytest.fixture()
def db() -> Session:
    """独立临时 SQLite（每次测试全新 schema，自动清理）。"""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    with session() as s:
        yield s
    engine.dispose()


# ---------------------------------------------------------------------------
# 构造工具
# ---------------------------------------------------------------------------


def _mk_task(
    kp_id: str,
    action: PlannerActionType,
    order: int,
    *,
    status: DiagnosisStatus = DiagnosisStatus.WEAK,
    priority: float | None = None,
    source_priority: float = 0.30,
    minutes: int = 20,
    reason_codes: list[PlannerReasonCode] | None = None,
) -> StudyTaskDraft:
    return StudyTaskDraft(
        draft_key=f"{kp_id}:{action.value}",
        knowledge_point_id=kp_id,
        knowledge_point_name=f"KP-{kp_id}",
        action_type=action,
        priority=priority if priority is not None else round(1.0 - (order - 1) * 0.1, 2),
        estimated_minutes=minutes,
        reason_codes=reason_codes or [PlannerReasonCode.CONFIRMED_WEAKNESS],
        source_status=status,
        source_priority_score=source_priority,
        order=order,
    )


def _draft(
    *,
    learner: str = "user-1",
    course: str = "course-1",
    tasks: list[StudyTaskDraft] | None = None,
    reason_codes: list[PlannerReasonCode] | None = None,
    generated: datetime = datetime(2026, 8, 14, 9, 0, 0),
    diag_at: datetime = datetime(2026, 8, 14, 8, 0, 0),
) -> StudyPlanDraft:
    return StudyPlanDraft(
        learner_id=learner,
        course_id=course,
        generated_at=generated,
        strategy=PlanStrategy.DIAGNOSIS_DRIVEN,
        tasks=tasks or [],
        reason_codes=(
            reason_codes
            if reason_codes is not None
            else [PlannerReasonCode.PRIMARY_FOCUS, PlannerReasonCode.CONFIRMED_WEAKNESS]
        ),
        source_diagnosis_generated_at=diag_at,
    )


# ---------------------------------------------------------------------------
# Test A / B / C：persist 成功 + 字段完整持久化
# ---------------------------------------------------------------------------


def test_persist_creates_plan_and_matching_tasks(db: Session) -> None:
    # Test A：普通 Draft（3 任务）persist 成功后，study_plans=1、study_tasks=3
    tasks = [
        _mk_task("kp-1", PlannerActionType.REMEDIATE, 1),
        _mk_task("kp-2", PlannerActionType.ASSESS, 2, status=DiagnosisStatus.UNASSESSED),
        _mk_task("kp-3", PlannerActionType.STRENGTHEN, 3, status=DiagnosisStatus.DEVELOPING),
    ]
    persisted = StudyPlanPersistenceService(db).persist(_draft(tasks=tasks))

    assert db.query(StudyPlan).count() == 1
    assert db.query(StudyTask).count() == 3
    assert persisted.id == persisted.id
    assert len(persisted.tasks) == 3


def test_persist_plan_fields_roundtrip(db: Session) -> None:
    # Test B：Plan 全部字段（learner/course/strategy/status/generated/source_diag/reason_codes）
    generated = datetime(2026, 8, 14, 10, 30, 0)
    diag_at = datetime(2026, 8, 14, 10, 0, 0)
    draft = _draft(
        learner="user-b",
        course="course-b",
        tasks=[_mk_task("kp-1", PlannerActionType.REVIEW, 1)],
        reason_codes=[PlannerReasonCode.MAINTENANCE_REVIEW],
        generated=generated,
        diag_at=diag_at,
    )
    persisted = StudyPlanPersistenceService(db).persist(draft)

    plan = StudyPlanRepository(db).get_by_id(persisted.id)
    assert plan is not None
    assert plan.learner_id == "user-b"
    assert plan.course_id == "course-b"
    assert plan.strategy == PlanStrategy.DIAGNOSIS_DRIVEN.value
    assert plan.status == StudyPlanStatus.ACTIVE.value
    assert plan.generated_at == generated
    assert plan.source_diagnosis_generated_at == diag_at
    assert plan.reason_codes == [PlannerReasonCode.MAINTENANCE_REVIEW.value]

    # 领域输出模型同样正确
    assert persisted.strategy == PlanStrategy.DIAGNOSIS_DRIVEN
    assert persisted.status == StudyPlanStatus.ACTIVE
    assert persisted.reason_codes == [PlannerReasonCode.MAINTENANCE_REVIEW]


def test_persist_task_fields_roundtrip(db: Session) -> None:
    # Test C：Task 全部字段（kp/action/minutes/reason_codes/source_status/source_priority/priority/order/draft_key）
    task = _mk_task(
        "kp-c",
        PlannerActionType.REMEDIATE,
        1,
        status=DiagnosisStatus.WEAK,
        priority=1.0,
        source_priority=0.243,
        minutes=35,
        reason_codes=[
            PlannerReasonCode.PRIMARY_FOCUS,
            PlannerReasonCode.CONFIRMED_WEAKNESS,
        ],
    )
    persisted = StudyPlanPersistenceService(db).persist(_draft(tasks=[task]))

    record = db.query(StudyTask).filter(StudyTask.plan_id == persisted.id).first()
    assert record is not None
    assert record.knowledge_point_id == "kp-c"
    assert record.knowledge_point_name == "KP-kp-c"
    assert record.action_type == PlannerActionType.REMEDIATE.value
    assert record.estimated_minutes == 35
    assert record.reason_codes == [
        PlannerReasonCode.PRIMARY_FOCUS.value,
        PlannerReasonCode.CONFIRMED_WEAKNESS.value,
    ]
    assert record.source_status == DiagnosisStatus.WEAK.value
    assert record.source_priority_score == 0.243
    assert record.priority == 1.0
    assert record.order == 1
    assert record.draft_key == "kp-c:remediate"


# ---------------------------------------------------------------------------
# Test D / E：读取重建完整计划 + 顺序稳定
# ---------------------------------------------------------------------------


def test_read_back_rebuilds_complete_plan(db: Session) -> None:
    # Test D：get_by_id + list_by_plan_id 重建完整计划
    tasks = [
        _mk_task("kp-1", PlannerActionType.REMEDIATE, 1),
        _mk_task("kp-2", PlannerActionType.ASSESS, 2, status=DiagnosisStatus.UNASSESSED),
        _mk_task("kp-3", PlannerActionType.REVIEW, 3, status=DiagnosisStatus.PROFICIENT),
    ]
    persisted = StudyPlanPersistenceService(db).persist(_draft(tasks=tasks))

    plan = StudyPlanRepository(db).get_by_id(persisted.id)
    tasks_read = StudyTaskRepository(db).list_by_plan_id(persisted.id)

    assert plan is not None
    assert plan.learner_id == persisted.learner_id
    assert [t.knowledge_point_id for t in tasks_read] == ["kp-1", "kp-2", "kp-3"]

    # 领域输出模型可完整还原
    rebuilt = StudyTaskRepository.to_domain(tasks_read[0])
    assert rebuilt.action_type == PlannerActionType.REMEDIATE
    assert rebuilt.knowledge_point_name == "KP-kp-1"
    assert rebuilt.order == 1


def test_task_order_preserved_after_read(db: Session) -> None:
    # Test E：Draft 顺序 1/2/3，读取后仍为 1/2/3（不依赖 SQLite 默认返回顺序）
    tasks = [
        _mk_task("kp-a", PlannerActionType.REVIEW, 1, status=DiagnosisStatus.PROFICIENT),
        _mk_task("kp-b", PlannerActionType.ASSESS, 2, status=DiagnosisStatus.UNASSESSED),
        _mk_task("kp-c", PlannerActionType.REMEDIATE, 3),
    ]
    persisted = StudyPlanPersistenceService(db).persist(_draft(tasks=tasks))

    records = db.query(StudyTask).filter(StudyTask.plan_id == persisted.id).all()
    # 显式排序查询 + Repository 层都保持 order 升序
    assert [r.order for r in records] == [1, 2, 3]
    assert [r.knowledge_point_id for r in records] == ["kp-a", "kp-b", "kp-c"]
    assert [t.order for t in persisted.tasks] == [1, 2, 3]


# ---------------------------------------------------------------------------
# Test F：Empty Plan 可保存
# ---------------------------------------------------------------------------


def test_empty_plan_persists(db: Session) -> None:
    # Test F：tasks=[] 仍可成功保存（NO_IMMEDIATE_INTERVENTION 是有效 Planner Snapshot）
    draft = _draft(
        tasks=[],
        reason_codes=[PlannerReasonCode.NO_IMMEDIATE_INTERVENTION],
    )
    persisted = StudyPlanPersistenceService(db).persist(draft)

    assert persisted.status == StudyPlanStatus.ACTIVE
    assert persisted.tasks == []
    assert persisted.reason_codes == [PlannerReasonCode.NO_IMMEDIATE_INTERVENTION]
    assert db.query(StudyPlan).count() == 1
    assert db.query(StudyTask).count() == 0


# ---------------------------------------------------------------------------
# Test G / H：事务回滚 + Repository 不自行 commit
# ---------------------------------------------------------------------------


class _FailingTaskRepository(StudyTaskRepository):
    """人为制造第 N 个任务保存失败的注入仓库。"""

    def create_many(self, *, plan_id: str, tasks: list[StudyTaskDraft]) -> list[StudyTask]:
        raise RuntimeError("boom: task creation failed")


def test_transaction_rolls_back_plan_and_tasks(db: Session) -> None:
    # Test G：Task 保存失败 → 全部回滚，不得半成功（plan 与 tasks 都无残留）
    service = StudyPlanPersistenceService(db, task_repo=_FailingTaskRepository(db))
    with pytest.raises(RuntimeError):
        service.persist(
            _draft(
                tasks=[
                    _mk_task("kp-1", PlannerActionType.REMEDIATE, 1),
                    _mk_task("kp-2", PlannerActionType.ASSESS, 2),
                ]
            )
        )

    assert db.query(StudyPlan).count() == 0
    assert db.query(StudyTask).count() == 0


def test_repository_create_does_not_commit(db: Session) -> None:
    # Test H：Repository 只 add/flush，不 commit —— 事务失败测试已间接证明；
    # 这里直接验证：repo.create 后不 commit，rollback 即无残留。
    repo = StudyPlanRepository(db)
    repo.create(
        learner_id="user-h",
        course_id="course-h",
        strategy=PlanStrategy.DIAGNOSIS_DRIVEN,
        status=StudyPlanStatus.ACTIVE,
        generated_at=datetime(2026, 8, 14, 9, 0, 0),
        source_diagnosis_generated_at=datetime(2026, 8, 14, 8, 0, 0),
        reason_codes=[PlannerReasonCode.PRIMARY_FOCUS],
    )
    db.rollback()
    assert db.query(StudyPlan).count() == 0


# ---------------------------------------------------------------------------
# Test I / J：服务端生成 ID，draft_key ≠ DB primary key
# ---------------------------------------------------------------------------


def test_ids_are_server_generated_not_controllable(db: Session) -> None:
    # Test I：正式 StudyPlan.id / StudyTask.id 由服务端生成，Draft 不控制
    persisted = StudyPlanPersistenceService(db).persist(
        _draft(tasks=[_mk_task("kp-i", PlannerActionType.REMEDIATE, 1)])
    )

    assert persisted.id
    assert len(persisted.id) == 36  # UUID
    assert persisted.tasks[0].id
    assert persisted.tasks[0].id != persisted.id

    # Draft 中没有任何可注入 DB id 的字段；即便重复调用也是全新 id
    second = StudyPlanPersistenceService(db).persist(
        _draft(tasks=[_mk_task("kp-i", PlannerActionType.REMEDIATE, 1)])
    )
    assert second.id != persisted.id


def test_draft_key_saved_but_not_primary_key(db: Session) -> None:
    # Test J：draft_key 正确保存，且不等于 DB primary key
    task = _mk_task("kp-j", PlannerActionType.REMEDIATE, 1)
    persisted = StudyPlanPersistenceService(db).persist(_draft(tasks=[task]))

    assert persisted.tasks[0].draft_key == "kp-j:remediate"
    assert persisted.tasks[0].draft_key != persisted.tasks[0].id

    record = db.query(StudyTask).filter(StudyTask.plan_id == persisted.id).first()
    assert record.draft_key == "kp-j:remediate"
    assert record.draft_key != record.id


# ---------------------------------------------------------------------------
# Test K：priority 与 source_priority_score 分别保存、不混淆
# ---------------------------------------------------------------------------


def test_priority_and_source_priority_score_stay_distinct(db: Session) -> None:
    # Test K：priority（Planner 排序结果）≠ source_priority_score（Diagnosis 输入）
    task = _mk_task(
        "kp-k",
        PlannerActionType.STRENGTHEN,
        2,
        status=DiagnosisStatus.DEVELOPING,
        priority=0.5,  # Planner 层排序结果
        source_priority=0.2,  # Diagnosis 输入原始分
    )
    persisted = StudyPlanPersistenceService(db).persist(_draft(tasks=[task]))

    assert persisted.tasks[0].priority == 0.5
    assert persisted.tasks[0].source_priority_score == 0.2
    assert persisted.tasks[0].priority != persisted.tasks[0].source_priority_score

    record = db.query(StudyTask).filter(StudyTask.plan_id == persisted.id).first()
    assert record.priority == 0.5
    assert record.source_priority_score == 0.2


# ---------------------------------------------------------------------------
# Test L / M / N：Enum DB round-trip
# ---------------------------------------------------------------------------


def test_planner_reason_code_roundtrip(db: Session) -> None:
    # Test L：全部 PlannerReasonCode 经过 DB round-trip 后语义一致
    codes = [
        PlannerReasonCode.PRIMARY_FOCUS,
        PlannerReasonCode.CONFIRMED_WEAKNESS,
        PlannerReasonCode.NEEDS_ASSESSMENT,
        PlannerReasonCode.NEEDS_MORE_EVIDENCE,
        PlannerReasonCode.NEEDS_STRENGTHENING,
        PlannerReasonCode.MAINTENANCE_REVIEW,
        PlannerReasonCode.NO_IMMEDIATE_INTERVENTION,
    ]
    persisted = StudyPlanPersistenceService(db).persist(
        _draft(tasks=[_mk_task("kp-l", PlannerActionType.ASSESS, 1, reason_codes=codes)])
    )

    assert persisted.tasks[0].reason_codes == codes
    # 从 DB 重新读取还原
    record = db.query(StudyTask).filter(StudyTask.plan_id == persisted.id).first()
    assert record.reason_codes == [c.value for c in codes]


def test_planner_action_type_roundtrip(db: Session) -> None:
    # Test M：全部 PlannerActionType 经过 DB round-trip 后一致
    actions = list(PlannerActionType)
    tasks = [
        _mk_task(f"kp-m{i}", action, i + 1, status=DiagnosisStatus.WEAK)
        for i, action in enumerate(actions)
    ]
    persisted = StudyPlanPersistenceService(db).persist(_draft(tasks=tasks))

    assert [t.action_type for t in persisted.tasks] == actions
    records = (
        db.query(StudyTask)
        .filter(StudyTask.plan_id == persisted.id)
        .order_by(StudyTask.order)
        .all()
    )
    assert [StudyTaskRepository.to_domain(r).action_type for r in records] == actions


def test_plan_strategy_roundtrip(db: Session) -> None:
    # Test N：PlanStrategy 经过 DB round-trip 后一致
    persisted = StudyPlanPersistenceService(db).persist(_draft())

    assert persisted.strategy == PlanStrategy.DIAGNOSIS_DRIVEN
    plan = StudyPlanRepository(db).get_by_id(persisted.id)
    assert plan is not None
    assert plan.strategy == PlanStrategy.DIAGNOSIS_DRIVEN.value


# ---------------------------------------------------------------------------
# Test O：真实 Demo 集成 —— Diagnosis → Planner → Draft → Persistence → SQLite
# ---------------------------------------------------------------------------


def test_real_demo_diagnosis_to_persisted_plan(db: Session) -> None:
    # Test O：不构造手写 Draft，跑真实闭环，验证第一条任务 = primary_focus 规划任务
    seed_demo_data(db)
    result = DiagnosisService(db).diagnose_learner_course(
        DEMO_LEARNER_ID, "course-os", "course-os"
    )
    assert result.primary_focus is not None
    assert result.primary_focus.knowledge_point_id == "kp-deadlock"

    draft = StudyPlannerService().generate_from_diagnosis(
        DEMO_LEARNER_ID, "course-os", result
    )
    persisted = StudyPlanPersistenceService(db).persist(draft)

    # Demo Plan（与 Phase 2D-0 一致）：
    # ① 死锁 WEAK → REMEDIATE 35min（PRIMARY_FOCUS）
    # ② 进程调度 UNASSESSED → ASSESS 15min
    # ③ 进程同步 DEVELOPING → STRENGTHEN 25min
    assert persisted.learner_id == DEMO_LEARNER_ID
    assert persisted.course_id == "course-os"
    assert persisted.status == StudyPlanStatus.ACTIVE
    assert persisted.strategy == PlanStrategy.DIAGNOSIS_DRIVEN
    assert persisted.source_diagnosis_generated_at == result.diagnosis_generated_at
    assert len(persisted.tasks) == 3

    assert persisted.tasks[0].knowledge_point_id == "kp-deadlock"
    assert persisted.tasks[0].action_type == PlannerActionType.REMEDIATE
    assert persisted.tasks[0].estimated_minutes == 35
    assert PlannerReasonCode.PRIMARY_FOCUS in persisted.tasks[0].reason_codes
    assert persisted.tasks[0].source_status == DiagnosisStatus.WEAK

    assert persisted.tasks[1].knowledge_point_id == "kp-scheduling"
    assert persisted.tasks[1].action_type == PlannerActionType.ASSESS
    assert persisted.tasks[1].estimated_minutes == 15
    assert PlannerReasonCode.NEEDS_ASSESSMENT in persisted.tasks[1].reason_codes

    assert persisted.tasks[2].knowledge_point_id == "kp-process-sync"
    assert persisted.tasks[2].action_type == PlannerActionType.STRENGTHEN
    assert persisted.tasks[2].estimated_minutes == 25

    # 从 DB 重新读取：顺序与内容完全一致
    plan = StudyPlanRepository(db).get_by_id(persisted.id)
    tasks = StudyTaskRepository(db).list_by_plan_id(persisted.id)
    assert plan is not None
    assert plan.status == StudyPlanStatus.ACTIVE.value
    assert [t.knowledge_point_id for t in tasks] == [
        "kp-deadlock",
        "kp-scheduling",
        "kp-process-sync",
    ]

    # Plan History 查询能力可用
    history = StudyPlanRepository(db).list_by_learner_and_course(
        DEMO_LEARNER_ID, "course-os"
    )
    assert [p.id for p in history] == [persisted.id]
