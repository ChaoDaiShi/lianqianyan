"""Phase 2D-2 StudyPlan Application/API 测试 —— 覆盖 generate / detail / history 闭环。

约定：
- **所有测试使用独立临时 SQLite（tmp_path 文件库）**，绝不触碰 apps/api/education.db。
- 表结构 + Seed 由 fixture 建立；get_db 依赖被覆盖到临时库。
- 使用 `raise_server_exceptions=False`，让服务器错误（500）可被断言而不是抛给测试。
- 客户端只提交 learner_id / course_id；Diagnosis / Tasks 全部由服务端确定性生成。
- Active 唯一性（Phase 3-1）：generate 时旧 ACTIVE 在同一事务内被 supersede，
  任意时刻至多一个 ACTIVE Plan；`GET /api/plans/current` 返回该计划。
"""

from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.routes import plans as plans_routes
from app.core.seed import DEMO_LEARNER_ID, seed_demo_data
from app.core.time import utc_now
from app.db.session import get_db
from app.domain import (
    Base,
    DiagnosisResultOut,
    MasteryRecord,
    PlanStrategy,
    PlannerActionType,
    PlannerReasonCode,
    StudyPlan,
    StudyPlanStatus,
    StudyTask,
)
from app.domain.models import KnowledgePointDiagnosis
from app.domain.planner import StudyPlanDraft, StudyTaskDraft
from app.main import create_app
from app.services import StudyPlanApplicationService
from app.services.study_task_repository import StudyTaskRepository

COURSE_OS = "course-os"
DEMO_KP_IDS = [
    "kp-process-concept",
    "kp-process-sync",
    "kp-pv",
    "kp-deadlock",
    "kp-scheduling",
]


# ---------------------------------------------------------------------------
# Fixtures：独立临时 DB + 覆盖依赖的 TestClient
# ---------------------------------------------------------------------------


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
    db = _TestDB(str(tmp_path / "plans_test.db"))
    with db.session() as s:
        seed_demo_data(s)
    yield db
    db.engine.dispose()


def _make_app(testdb: _TestDB, *, plans_service_factory=None):
    """构建覆盖了 get_db 的 app。

    不使用 `with TestClient(...)`（不触发 lifespan），避免启动时
    对全局 education.db 做 create_all / seed；表与 Seed 已由 testdb fixture 建立。
    """
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


def _generate(
    client: TestClient, *, learner_id: str = DEMO_LEARNER_ID, course_id: str = COURSE_OS
):
    return client.post("/api/plans/generate", json={"learner_id": learner_id, "course_id": course_id})


def _history(
    client: TestClient, *, learner_id: str = DEMO_LEARNER_ID, course_id: str = COURSE_OS
):
    return client.get("/api/plans", params={"learner_id": learner_id, "course_id": course_id})


def _seed_all_mastered(testdb: _TestDB, learner_id: str) -> None:
    """把某 learner 的全部课程知识点置为 MASTERED（构造 Empty Plan 场景）。"""
    with testdb.session() as s:
        for kp_id in DEMO_KP_IDS:
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


def _diagnosis_primary_focus(client: TestClient, learner_id: str) -> str | None:
    body = client.get(f"/api/diagnosis/{learner_id}", params={"course_id": COURSE_OS}).json()
    focus = body.get("primary_focus")
    return focus.get("knowledge_point_id") if focus else None


# ---------------------------------------------------------------------------
# Test A：POST /api/plans/generate 合法请求 → 201 + 完整 Plan + Tasks
# ---------------------------------------------------------------------------


def test_generate_returns_201_with_complete_plan(client: TestClient) -> None:
    response = _generate(client)
    assert response.status_code == 201
    body = response.json()
    assert body["id"]
    assert body["learner_id"] == DEMO_LEARNER_ID
    assert body["course_id"] == COURSE_OS
    assert body["strategy"] == PlanStrategy.DIAGNOSIS_DRIVEN.value
    assert body["status"] == StudyPlanStatus.ACTIVE.value
    assert body["generated_at"]
    assert body["source_diagnosis_generated_at"]
    assert isinstance(body["reason_codes"], list)
    assert len(body["tasks"]) == 3
    task = body["tasks"][0]
    for key in (
        "id",
        "plan_id",
        "knowledge_point_id",
        "knowledge_point_name",
        "action_type",
        "priority",
        "estimated_minutes",
        "reason_codes",
        "source_status",
        "source_priority_score",
        "order",
        "draft_key",
        "created_at",
    ):
        assert key in task, f"task missing field: {key}"


# ---------------------------------------------------------------------------
# Test B / C：Generate 真正写入 study_plans / study_tasks
# ---------------------------------------------------------------------------


def test_generate_writes_plan_and_tasks_to_db(client: TestClient, testdb: _TestDB) -> None:
    response = _generate(client)
    assert response.status_code == 201
    plan_id = response.json()["id"]

    assert testdb.count(StudyPlan) == 1
    assert testdb.count(StudyTask) == 3
    with testdb.session() as s:
        plan = s.get(StudyPlan, plan_id)
        assert plan is not None
        assert plan.status == StudyPlanStatus.ACTIVE.value
        assert s.query(StudyTask).filter(StudyTask.plan_id == plan_id).count() == 3


# ---------------------------------------------------------------------------
# Test D：Response learner/course/strategy/status 正确
# ---------------------------------------------------------------------------


def test_generate_response_core_fields(client: TestClient) -> None:
    body = _generate(client).json()
    assert body["learner_id"] == DEMO_LEARNER_ID
    assert body["course_id"] == COURSE_OS
    assert body["strategy"] == "diagnosis_driven"
    assert body["status"] == "active"
    # 稳定 enum value，不是 Python Enum repr
    assert body["reason_codes"][0] == PlannerReasonCode.PRIMARY_FOCUS.value


# ---------------------------------------------------------------------------
# Test E：Response Tasks 按 order 排序
# ---------------------------------------------------------------------------


def test_generate_tasks_ordered_by_order(client: TestClient) -> None:
    body = _generate(client).json()
    orders = [t["order"] for t in body["tasks"]]
    assert orders == [1, 2, 3]
    # 首个任务 priority = 1.0，依次递减
    assert body["tasks"][0]["priority"] == 1.0
    assert body["tasks"][0]["priority"] > body["tasks"][1]["priority"]


# ---------------------------------------------------------------------------
# Test F / G：GET /api/plans/{plan_id} —— 完整读取 / 404
# ---------------------------------------------------------------------------


def test_get_plan_returns_complete_plan(client: TestClient) -> None:
    plan_id = _generate(client).json()["id"]

    response = client.get(f"/api/plans/{plan_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == plan_id
    assert body["learner_id"] == DEMO_LEARNER_ID
    assert len(body["tasks"]) == 3
    assert [t["order"] for t in body["tasks"]] == [1, 2, 3]


def test_get_nonexistent_plan_returns_404(client: TestClient) -> None:
    response = client.get("/api/plans/nonexistent")
    assert response.status_code == 404
    assert response.json()["detail"] == "study plan not found"


# ---------------------------------------------------------------------------
# Test H / I / J / K：History —— 查询 / 排序 / +1 / 最新在前
# ---------------------------------------------------------------------------


def test_history_empty_when_no_plan(client: TestClient) -> None:
    response = _history(client)
    assert response.status_code == 200
    assert response.json() == []


def test_history_summary_fields_and_no_tasks(client: TestClient) -> None:
    _generate(client)
    items = _history(client).json()
    assert len(items) == 1
    summary = items[0]
    for key in (
        "id",
        "learner_id",
        "course_id",
        "strategy",
        "status",
        "generated_at",
        "created_at",
        "task_count",
        "reason_codes",
    ):
        assert key in summary
    assert "tasks" not in summary
    assert summary["task_count"] == 3


def test_history_sorted_desc_and_generate_increments(client: TestClient) -> None:
    # History Before → 0
    assert len(_history(client).json()) == 0

    first = _generate(client).json()
    second = _generate(client).json()

    items = _history(client).json()
    assert len(items) == 2  # History After → 2（+2，因为连续生成了两份）
    assert items[0]["id"] == second["id"]  # 最新在前（generated_at DESC）
    assert items[1]["id"] == first["id"]
    assert items[0]["generated_at"] >= items[1]["generated_at"]
    # Active 唯一性（Phase 3-1）：最新的 active，旧计划 superseded
    assert items[0]["status"] == "active" and items[1]["status"] == "superseded"


# ---------------------------------------------------------------------------
# Test L：POST Response 与 GET Detail 核心字段一致
# ---------------------------------------------------------------------------


def test_generate_and_detail_agree(client: TestClient) -> None:
    generated = _generate(client)
    assert generated.status_code == 201
    gen = generated.json()
    plan_id = gen["id"]

    detail = client.get(f"/api/plans/{plan_id}").json()
    for field in ("id", "learner_id", "course_id", "strategy", "status", "reason_codes"):
        assert detail[field] == gen[field], field
    assert len(detail["tasks"]) == len(gen["tasks"])
    for g_task, d_task in zip(gen["tasks"], detail["tasks"]):
        for field in (
            "id",
            "plan_id",
            "draft_key",
            "knowledge_point_id",
            "action_type",
            "priority",
            "estimated_minutes",
            "order",
            "source_status",
            "source_priority_score",
        ):
            assert d_task[field] == g_task[field], field


# ---------------------------------------------------------------------------
# Test M：第一任务尊重真实 Diagnosis primary_focus
# ---------------------------------------------------------------------------


def test_first_task_respects_diagnosis_primary_focus(client: TestClient) -> None:
    focus_kp = _diagnosis_primary_focus(client, DEMO_LEARNER_ID)
    assert focus_kp == "kp-deadlock"  # Demo Seed：死锁 WEAK

    body = _generate(client).json()
    assert body["tasks"][0]["knowledge_point_id"] == focus_kp
    assert body["tasks"][0]["action_type"] == "remediate"
    assert PlannerReasonCode.PRIMARY_FOCUS.value in body["tasks"][0]["reason_codes"]


# ---------------------------------------------------------------------------
# Test N：UNASSESSED → ASSESS（绝不 REMEDIATE）
# ---------------------------------------------------------------------------


def test_unassessed_learner_gets_assess_not_remediate(client: TestClient) -> None:
    learner = "fresh-learner-001"
    body = _generate(client, learner_id=learner).json()

    assert len(body["tasks"]) == 3  # MAX_TASKS=3
    actions = {t["action_type"] for t in body["tasks"]}
    assert actions == {"assess"}
    assert all(t["source_status"] == "unassessed" for t in body["tasks"])


# ---------------------------------------------------------------------------
# Test O / P：空 learner_id / course_id → 422
# ---------------------------------------------------------------------------


def test_empty_learner_id_returns_422(client: TestClient) -> None:
    response = client.post(
        "/api/plans/generate", json={"learner_id": "", "course_id": COURSE_OS}
    )
    assert response.status_code == 422


def test_empty_course_id_returns_422(client: TestClient) -> None:
    response = client.post(
        "/api/plans/generate", json={"learner_id": DEMO_LEARNER_ID, "course_id": ""}
    )
    assert response.status_code == 422


def test_blank_learner_id_returns_422(client: TestClient) -> None:
    response = client.post(
        "/api/plans/generate", json={"learner_id": "   ", "course_id": COURSE_OS}
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Test Q：ApplicationService 不绕过 DiagnosisService（Fake 证明编排链路）
# ---------------------------------------------------------------------------


class _RecordingDiagnosisService:
    """记录是否被调用；返回固定 DiagnosisResult（用于证明 Planner 收到它）。"""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []
        self.result = self._build_result()

    def diagnose_learner_course(
        self, learner_id: str, course_id: str, course_name: str
    ) -> DiagnosisResultOut:
        self.calls.append((learner_id, course_id))
        return self.result

    @staticmethod
    def _build_result() -> DiagnosisResultOut:
        focus = KnowledgePointDiagnosis(
            knowledge_point_id="kp-fake",
            knowledge_point_name="Fake KP",
            mastery_score=0.4,
            confidence=0.6,
            evidence_count=3,
            status="weak",
            priority_score=0.3,
            reason_codes=["LOW_MASTERY"],
        )
        return DiagnosisResultOut(
            learner_id="x",
            course_id="y",
            course_name="y",
            primary_focus=focus,
            priority_interventions=[focus],
            strengths=[],
            weak_points=[focus],
            developing_points=[],
            unassessed_points=[],
            summary_codes=["LOW_MASTERY"],
            diagnosis_generated_at=datetime(2026, 8, 14, 8, 0, 0),
        )


class _RecordingPlannerService:
    """记录收到的 DiagnosisResult；把它的 primary_focus 原样写进 Draft。"""

    def __init__(self) -> None:
        self.seen_diagnosis: DiagnosisResultOut | None = None

    def generate_from_diagnosis(
        self, learner_id: str, course_id: str, diagnosis_result: DiagnosisResultOut
    ) -> StudyPlanDraft:
        self.seen_diagnosis = diagnosis_result
        focus = diagnosis_result.primary_focus
        task = StudyTaskDraft(
            draft_key=f"{focus.knowledge_point_id}:remediate",
            knowledge_point_id=focus.knowledge_point_id,
            knowledge_point_name=focus.knowledge_point_name,
            action_type=PlannerActionType.REMEDIATE,
            priority=1.0,
            estimated_minutes=35,
            reason_codes=[PlannerReasonCode.PRIMARY_FOCUS, PlannerReasonCode.CONFIRMED_WEAKNESS],
            source_status=focus.status,
            source_priority_score=focus.priority_score,
            order=1,
        )
        return StudyPlanDraft(
            learner_id=learner_id,
            course_id=course_id,
            generated_at=datetime(2026, 8, 14, 9, 0, 0),
            tasks=[task],
            reason_codes=[PlannerReasonCode.PRIMARY_FOCUS],
            source_diagnosis_generated_at=diagnosis_result.diagnosis_generated_at,
        )


def test_application_service_routes_through_diagnosis_service(testdb: _TestDB) -> None:
    diagnosis = _RecordingDiagnosisService()
    planner = _RecordingPlannerService()

    service = StudyPlanApplicationService(
        testdb.session(),
        diagnosis_service=diagnosis,  # type: ignore[arg-type]
        planner_service=planner,  # type: ignore[arg-type]
    )
    persisted = service.generate_plan("learner-q", "course-q")

    # DiagnosisService 被调用一次，且参数正确
    assert diagnosis.calls == [("learner-q", "course-q")]
    # Planner 收到的是 DiagnosisService 产生的同一对象（不是自己查 Mastery 的结果）
    assert planner.seen_diagnosis is diagnosis.result
    assert persisted.tasks[0].knowledge_point_id == "kp-fake"
    assert persisted.learner_id == "learner-q"


# ---------------------------------------------------------------------------
# Test R：Persistence 失败 → 服务器错误 + DB 不留下半个 Plan
# ---------------------------------------------------------------------------


class _FailingTaskRepository(StudyTaskRepository):
    """人为制造任务保存失败的注入仓库。"""

    def create_many(self, *, plan_id: str, tasks: list[StudyTaskDraft]) -> list[StudyTask]:
        raise RuntimeError("boom: task creation failed")


def test_persistence_failure_returns_server_error_and_no_half_plan(testdb: _TestDB) -> None:
    def failing_service(db=Session):
        return StudyPlanApplicationService(db, task_repo=_FailingTaskRepository(db))

    app = _make_app(testdb, plans_service_factory=failing_service)
    client = TestClient(app, raise_server_exceptions=False)

    response = client.post(
        "/api/plans/generate", json={"learner_id": DEMO_LEARNER_ID, "course_id": COURSE_OS}
    )
    assert response.status_code == 500
    # 同一事务已回滚：Plan 与 Tasks 都无残留
    assert testdb.count(StudyPlan) == 0
    assert testdb.count(StudyTask) == 0


# ---------------------------------------------------------------------------
# Test S：连续 Generate → 旧 ACTIVE 被自动 supersede（Phase 3-1 Active 唯一性）
# ---------------------------------------------------------------------------


def test_two_generates_supersede_old_plan(client: TestClient, testdb: _TestDB) -> None:
    first = _generate(client).json()
    second = _generate(client).json()

    assert first["id"] != second["id"]
    assert first["status"] == "active"
    assert second["status"] == "active"
    with testdb.session() as s:
        statuses = [
            row[0]
            for row in s.query(StudyPlan.status).order_by(StudyPlan.generated_at).all()
        ]
    # 旧计划在同一事务内被 supersede：至多一个 ACTIVE
    assert statuses == ["superseded", "active"]


# ---------------------------------------------------------------------------
# Test T：Empty Plan —— 全部 MASTERED → API 仍 201 创建并可读取
# ---------------------------------------------------------------------------


def test_empty_plan_created_and_readable(client: TestClient, testdb: _TestDB) -> None:
    learner = "all-mastered-learner"
    _seed_all_mastered(testdb, learner)

    response = _generate(client, learner_id=learner)
    assert response.status_code == 201
    body = response.json()
    assert body["tasks"] == []
    assert body["reason_codes"] == [PlannerReasonCode.NO_IMMEDIATE_INTERVENTION.value]
    assert body["status"] == "active"

    detail = client.get(f"/api/plans/{body['id']}").json()
    assert detail["tasks"] == []

    summary = _history(client, learner_id=learner).json()[0]
    assert summary["task_count"] == 0
