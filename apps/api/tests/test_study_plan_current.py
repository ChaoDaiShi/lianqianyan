"""Phase 3-1 Current Plan Lifecycle 测试 —— 覆盖 current / supersede / 事务原子性。

约定：
- **所有测试使用独立临时 SQLite（tmp_path 文件库）**，绝不触碰 apps/api/education.db。
- 表结构 + Seed 由 fixture 建立；get_db 依赖被覆盖到临时库。
- 使用 `raise_server_exceptions=False`，让服务器错误（500）可被断言而不是抛给测试。
- Active 唯一性语义：generate 时旧 ACTIVE 在同一事务内被 supersede，
  任意时刻至多一个 ACTIVE Plan；`GET /api/plans/current` 返回该计划。
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.routes import plans as plans_routes
from tests.seed_fixtures import TEST_LEARNER_ID, seed_test_data
from app.core.time import utc_now
from app.db.session import get_db
from app.domain import (
    Base,
    MasteryRecord,
    PlanStrategy,
    PlannerReasonCode,
    StudyPlan,
    StudyPlanStatus,
    StudyTask,
)
from app.main import create_app
from app.services import StudyPlanApplicationService
from app.services.study_task_repository import StudyTaskRepository

COURSE_OS = "course-os"
TEST_KP_IDS = [
    "kp-process-concept",
    "kp-process-sync",
    "kp-pv",
    "kp-deadlock",
    "kp-scheduling",
]


class _TestDB:
    """独立临时 SQLite（文件库，避免 :memory: 跨连接不可见 / 锁冲突）。"""

    def __init__(self, path: str) -> None:
        self.engine = create_engine(
            f"sqlite:///{path}", connect_args={"check_same_thread": False}
        )
        Base.metadata.create_all(bind=self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)

    def session(self) -> Session:
        return self.session_factory()

    def count(self, model: type) -> int:
        with self.session() as s:
            return s.query(model).count()


@pytest.fixture()
def testdb(tmp_path: Path) -> _TestDB:
    db = _TestDB(str(tmp_path / "plans_current_test.db"))
    with db.session() as s:
        seed_test_data(s)
    yield db
    db.engine.dispose()


def _make_app(testdb: _TestDB, *, plans_service_factory=None):
    """构建覆盖了 get_db 的 app（不触发 lifespan，避免触碰全局 education.db）。"""
    app = create_app()

    def override_get_db():
        session = testdb.session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    if plans_service_factory is not None:
        app.dependency_overrides[plans_routes._service] = plans_service_factory
    return app


@pytest.fixture()
def client(testdb: _TestDB) -> TestClient:
    return TestClient(_make_app(testdb), raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# 构造工具
# ---------------------------------------------------------------------------


def _generate(client: TestClient, *, learner_id: str = TEST_LEARNER_ID) -> dict:
    resp = client.post(
        "/api/plans/generate", json={"learner_id": learner_id, "course_id": COURSE_OS}
    )
    assert resp.status_code == 201
    return resp.json()


def _current(client: TestClient, *, learner_id: str = TEST_LEARNER_ID):
    return client.get(
        "/api/plans/current", params={"learner_id": learner_id, "course_id": COURSE_OS}
    )


def _history(client: TestClient, *, learner_id: str = TEST_LEARNER_ID):
    return client.get(
        "/api/plans", params={"learner_id": learner_id, "course_id": COURSE_OS}
    )


def _insert_plan(
    testdb: _TestDB,
    *,
    learner_id: str,
    generated_at: datetime,
    status: StudyPlanStatus,
    reason_codes: list[PlannerReasonCode] | None = None,
) -> str:
    """直接往 study_plans 插入一条计划（绕过 generate，用于构造遗留数据场景）。"""
    plan_id = str(uuid.uuid4())
    with testdb.session() as s:
        s.add(
            StudyPlan(
                id=plan_id,
                learner_id=learner_id,
                course_id=COURSE_OS,
                strategy=PlanStrategy.DIAGNOSIS_DRIVEN.value,
                status=status.value,
                generated_at=generated_at,
                source_diagnosis_generated_at=generated_at,
                reason_codes=[c.value for c in (reason_codes or [])],
                created_at=generated_at,
                updated_at=generated_at,
            )
        )
        s.commit()
    return plan_id


def _seed_all_mastered(testdb: _TestDB, learner_id: str) -> None:
    """把某 learner 的全部课程知识点置为 MASTERED（构造 Empty Plan 场景）。"""
    with testdb.session() as s:
        for kp_id in TEST_KP_IDS:
            s.add(
                MasteryRecord(
                    id=str(uuid.uuid4()),
                    learner_id=learner_id,
                    knowledge_point_id=kp_id,
                    mastery_score=0.96,
                    confidence=0.9,
                    evidence_count=6,
                    created_at=utc_now(),
                    updated_at=utc_now(),
                )
            )
        s.commit()


# ---------------------------------------------------------------------------
# Test A：generate 后 current 返回该计划（200 完整 Plan + Tasks）
# ---------------------------------------------------------------------------


def test_current_returns_latest_generated_plan(client: TestClient) -> None:
    generated = _generate(client)

    resp = _current(client)
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == generated["id"]
    assert body["status"] == StudyPlanStatus.ACTIVE.value
    assert body["learner_id"] == TEST_LEARNER_ID
    assert body["course_id"] == COURSE_OS
    assert len(body["tasks"]) == len(generated["tasks"])
    for g_task, c_task in zip(generated["tasks"], body["tasks"]):
        assert g_task["id"] == c_task["id"]
        assert c_task["order"] == g_task["order"]


# ---------------------------------------------------------------------------
# Test B：generate ×2 → 旧计划 superseded、新计划为 current
# ---------------------------------------------------------------------------


def test_generate_twice_supersedes_previous(client: TestClient, testdb: _TestDB) -> None:
    first = _generate(client)
    second = _generate(client)

    # DB 内只有一个 ACTIVE：旧的 superseded、新的 active
    with testdb.session() as s:
        statuses = [
            row[0] for row in s.query(StudyPlan.status).order_by(StudyPlan.generated_at).all()
        ]
    assert statuses == [StudyPlanStatus.SUPERSEDED.value, StudyPlanStatus.ACTIVE.value]

    # current 恒返回最新的 active 计划
    body = _current(client).json()
    assert body["id"] == second["id"]

    # History 忠实反映生命周期状态
    items = _history(client).json()
    assert [item["id"] for item in items] == [second["id"], first["id"]]
    assert items[0]["status"] == StudyPlanStatus.ACTIVE.value
    assert items[1]["status"] == StudyPlanStatus.SUPERSEDED.value


# ---------------------------------------------------------------------------
# Test C：无任何计划 → current 404（诚实空状态，不自动生成）
# ---------------------------------------------------------------------------


def test_current_404_when_no_plan(client: TestClient) -> None:
    resp = _current(client)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "no current study plan"
    # 纯读取：404 不产生任何计划（GET 绝不制造 DB 副作用）
    assert client.get("/api/plans", params={"learner_id": TEST_LEARNER_ID, "course_id": COURSE_OS}).json() == []


# ---------------------------------------------------------------------------
# Test D：current 返回完整 Tasks（order 排序），与新计划一致
# ---------------------------------------------------------------------------


def test_current_returns_tasks_ordered(client: TestClient) -> None:
    generated = _generate(client)

    body = _current(client).json()
    orders = [task["order"] for task in body["tasks"]]
    assert orders == sorted(orders)
    assert [task["draft_key"] for task in body["tasks"]] == [
        task["draft_key"] for task in generated["tasks"]
    ]


# ---------------------------------------------------------------------------
# Test E：历史遗留多 ACTIVE 数据 → current 确定性取 generated_at DESC 第一条
# ---------------------------------------------------------------------------


def test_current_picks_newest_when_legacy_multiple_active(testdb: _TestDB) -> None:
    # 模拟 Phase 3-1 之前遗留：同一 learner/course 存在两个 ACTIVE 计划
    older = _insert_plan(
        testdb,
        learner_id=TEST_LEARNER_ID,
        generated_at=datetime(2026, 8, 15, 8, 0, 0),
        status=StudyPlanStatus.ACTIVE,
    )
    newer = _insert_plan(
        testdb,
        learner_id=TEST_LEARNER_ID,
        generated_at=datetime(2026, 8, 16, 8, 0, 0),
        status=StudyPlanStatus.ACTIVE,
    )
    assert older != newer

    client = TestClient(_make_app(testdb), raise_server_exceptions=False)
    body = _current(client).json()
    # 确定性兜底：取 generated_at 最新的那条
    assert body["id"] == newer


# ---------------------------------------------------------------------------
# Test F：Empty Plan（NO_IMMEDIATE_INTERVENTION）同样是合法 current，
#         且会 supersede 旧计划（重新规划为空 → 无任务但不留双 ACTIVE）
# ---------------------------------------------------------------------------


def test_empty_plan_supersedes_previous(client: TestClient, testdb: _TestDB) -> None:
    # 独立 learner（seed 只给 test-learner-001 建基线，避免 mastery_records UNIQUE 冲突）
    learner = "empty-plan-learner"
    first = _generate(client, learner_id=learner)
    assert len(first["tasks"]) == 3  # 全 UNASSESSED → 3 个 ASSESS 任务（MAX_TASKS 截断）

    _seed_all_mastered(testdb, learner)
    empty = _generate(client, learner_id=learner)
    assert empty["tasks"] == []
    assert PlannerReasonCode.NO_IMMEDIATE_INTERVENTION.value in empty["reason_codes"]

    # current 是新 Empty Plan（ACTIVE），旧计划 superseded
    body = _current(client, learner_id=learner).json()
    assert body["id"] == empty["id"]
    assert body["status"] == StudyPlanStatus.ACTIVE.value
    assert body["tasks"] == []

    items = _history(client, learner_id=learner).json()
    assert items[0]["id"] == empty["id"]
    assert items[0]["status"] == StudyPlanStatus.ACTIVE.value
    assert items[1]["id"] == first["id"]
    assert items[1]["status"] == StudyPlanStatus.SUPERSEDED.value


# ---------------------------------------------------------------------------
# Test G：持久化失败（Fake Task Repo）→ 500 且旧计划不被 supersede（事务原子性）
# ---------------------------------------------------------------------------


class _FailingTaskRepository(StudyTaskRepository):
    """人为制造任务保存失败的注入仓库（supersede 发生在它之前，必须一起回滚）。"""

    def create_many(self, *, plan_id: str, tasks: list) -> list[StudyTask]:
        raise RuntimeError("boom: task creation failed")


def test_persist_failure_keeps_previous_plan_active(testdb: _TestDB) -> None:
    # 先成功生成一份正常计划
    normal_client = TestClient(_make_app(testdb), raise_server_exceptions=False)
    first = _generate(normal_client)

    # 注入失败仓库 → generate 500；supersede 与新计划必须同事务回滚
    def failing_service(db=Session):
        return StudyPlanApplicationService(db, task_repo=_FailingTaskRepository(db))

    app = _make_app(testdb, plans_service_factory=failing_service)
    client = TestClient(app, raise_server_exceptions=False)
    resp = client.post(
        "/api/plans/generate", json={"learner_id": TEST_LEARNER_ID, "course_id": COURSE_OS}
    )
    assert resp.status_code == 500

    # 旧计划仍是唯一的 ACTIVE（supersede 未生效），DB 无半个新 Plan
    assert testdb.count(StudyPlan) == 1
    with testdb.session() as s:
        plan = s.get(StudyPlan, first["id"])
        assert plan is not None
        assert plan.status == StudyPlanStatus.ACTIVE.value


# ---------------------------------------------------------------------------
# Test H：路由顺序 —— /current 不被 /{plan_id} 吞掉
# ---------------------------------------------------------------------------


def test_current_route_not_shadowed_by_plan_id(client: TestClient) -> None:
    # 缺必填 learner_id → 422（走的是 /current handler 的 query 校验，而非 /{plan_id}）
    shadowed = client.get("/api/plans/current")
    assert shadowed.status_code == 422

    # 带合法参数但无计划 → current 专属 404 detail
    no_plan = client.get(
        "/api/plans/current", params={"learner_id": TEST_LEARNER_ID, "course_id": COURSE_OS}
    )
    assert no_plan.status_code == 404
    assert no_plan.json()["detail"] == "no current study plan"

    # 真正不存在的 plan_id 返回另一条 detail —— 两者可区分 → 路由未互相遮蔽
    missing = client.get("/api/plans/definitely-not-a-plan")
    assert missing.status_code == 404
    assert missing.json()["detail"] == "study plan not found"


# ---------------------------------------------------------------------------
# Test I：不同 learner 的 current 互不影响（作用域隔离）
# ---------------------------------------------------------------------------


def test_current_is_scoped_per_learner(client: TestClient) -> None:
    _generate(client)  # 为 TEST_LEARNER_ID 生成计划

    # 另一个从未生成过计划的 learner → 404
    other = client.get(
        "/api/plans/current", params={"learner_id": "learner-other", "course_id": COURSE_OS}
    )
    assert other.status_code == 404
    assert other.json()["detail"] == "no current study plan"

    # Demo learner 的 current 仍正常
    assert _current(client).status_code == 200
