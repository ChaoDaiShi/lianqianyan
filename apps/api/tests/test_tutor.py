"""Phase 3-0 Tutor Agent Foundation 测试 —— 覆盖 ContextBuilder / TutorService / API。

约定：
- **所有测试使用独立临时 SQLite（tmp_path 文件库）**，绝不触碰 apps/api/education.db。
- 表结构 + Seed 由 fixture 建立；get_db 依赖被覆盖到临时库。
- 客户端只提交 learner_id / course_id / message；学习上下文全部由服务端确定性构建。
- LLM 默认使用 MockTutorProvider（接口真实、确定性、上下文感知）。
- 覆盖 Test A~I（见各测试函数标题注释）。
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from tests.seed_fixtures import TEST_LEARNER_ID, seed_test_data
from app.db.session import get_db
from app.domain import Base
from app.domain.tutor import TutorConversationRequest
from app.llm.provider import BaseLLMProvider, LLMMessage, LLMResult
from app.main import create_app
from app.knowledge import KnowledgeContextBuilder
from app.services import TutorContextBuilder, TutorService
from app.services.tutor_prompt import SYSTEM_PROMPT

COURSE_OS = "course-os"
DEMO_MESSAGE = "为什么我总学不会死锁？"


def test_tutor_system_prompt_uses_cyrene_persona_contract() -> None:
    assert (
        "P0 安全 > P1 真实 > P2 目标 > P3 专业 > P4 人格 > P5 风格"
        in SYSTEM_PROMPT
    )
    assert "## 1. 目标优先" in SYSTEM_PROMPT
    assert "## 2. 真实优先" in SYSTEM_PROMPT
    assert "## 3. 执行优先" in SYSTEM_PROMPT
    assert "## 4. 专业正确优先" in SYSTEM_PROMPT
    assert "小涟默认呈现为陪伴学生成长的学姐" in SYSTEM_PROMPT
    assert "先回应人，再回应问题" in SYSTEM_PROMPT
    assert "后台推理完全静默" in SYSTEM_PROMPT
    assert "自称「小涟」" in SYSTEM_PROMPT
    assert "回复末尾添加 1 个音乐符号" in SYSTEM_PROMPT


def test_tutor_system_prompt_preserves_platform_truth_and_action_boundaries() -> None:
    assert "课程事实只能依据 COURSE KNOWLEDGE" in SYSTEM_PROMPT
    assert "学习判断只能依据 LEARNER CONTEXT" in SYSTEM_PROMPT
    assert "不得虚构搜索、编译、文件处理、判卷、删除" in SYSTEM_PROMPT
    assert "自然语言回复本身不代表已经执行删除" in SYSTEM_PROMPT
    assert "不得输出隐藏推理过程" in SYSTEM_PROMPT
    assert "JSON、代码、命令、工具参数" in SYSTEM_PROMPT


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


@pytest.fixture()
def testdb(tmp_path: Path) -> _TestDB:
    db = _TestDB(str(tmp_path / "tutor_test.db"))
    with db.session() as s:
        seed_test_data(s)
    yield db
    db.engine.dispose()


@pytest.fixture()
def client(testdb: _TestDB) -> TestClient:
    """覆盖 get_db 的 app（不触发 lifespan，避免触碰全局 education.db）。"""
    app = create_app()

    def override_get_db():
        session = testdb.session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app, raise_server_exceptions=False)


def _chat(
    client: TestClient,
    *,
    learner_id: str = TEST_LEARNER_ID,
    course_id: str = COURSE_OS,
    message: str = DEMO_MESSAGE,
):
    return client.post(
        "/api/tutor/chat",
        json={"learner_id": learner_id, "course_id": course_id, "message": message},
    )


def _generate_plan(client: TestClient) -> str:
    """为 demo learner 生成一份真实 StudyPlan，返回 plan_id。"""
    response = client.post(
        "/api/plans/generate",
        json={"learner_id": TEST_LEARNER_ID, "course_id": COURSE_OS},
    )
    assert response.status_code == 201
    return response.json()["id"]


# ---------------------------------------------------------------------------
# Test A：TutorContextBuilder 能读取 Profile
# ---------------------------------------------------------------------------


def test_context_builder_reads_profile(testdb: _TestDB) -> None:
    context = TutorContextBuilder(testdb.session()).build(TEST_LEARNER_ID, COURSE_OS)

    assert context.profile is not None
    assert context.profile.total_knowledge_points == 5  # course-os 五知识点
    assert context.profile.assessed_count == 4  # 进程调度 UNASSESSED
    assert context.profile.overall_mastery is not None
    assert "profile" in context.context_used
    # 来自 LearnerProfileService（不重复计算）—— PV 掌握度与 Seed 基线一致
    pv = next(p for p in context.profile.points if p.knowledge_point_id == "kp-pv")
    assert pv.mastery_score == pytest.approx(0.58)


# ---------------------------------------------------------------------------
# Test B：TutorContextBuilder 能读取 Diagnosis
# ---------------------------------------------------------------------------


def test_context_builder_reads_diagnosis(testdb: _TestDB) -> None:
    context = TutorContextBuilder(testdb.session()).build(TEST_LEARNER_ID, COURSE_OS)

    assert context.diagnosis is not None
    assert context.diagnosis.primary_focus is not None
    assert context.diagnosis.primary_focus.knowledge_point_id == "kp-deadlock"
    assert context.diagnosis.primary_focus.mastery_score == pytest.approx(0.46)
    assert any(p.knowledge_point_id == "kp-deadlock" for p in context.diagnosis.weak_points)
    assert "diagnosis" in context.context_used


# ---------------------------------------------------------------------------
# Test C：TutorContextBuilder 能读取 StudyPlan（最新 generated_at DESC 第一条）
# ---------------------------------------------------------------------------


def test_context_builder_reads_study_plan(client: TestClient, testdb: _TestDB) -> None:
    _generate_plan(client)
    context = TutorContextBuilder(testdb.session()).build(TEST_LEARNER_ID, COURSE_OS)

    assert context.plan.has_plan is True
    assert context.plan.plan_id is not None
    assert len(context.plan.tasks) == 3
    # 最新计划（Phase 2D Demo Plan）：死锁 REMEDIATE 35min 优先
    first = context.plan.tasks[0]
    assert first.knowledge_point_id == "kp-deadlock"
    assert first.action_type == "remediate"
    assert first.estimated_minutes == 35
    assert "study_plan" in context.context_used


# ---------------------------------------------------------------------------
# Test D：Context 不存在 Plan 时正常工作
# ---------------------------------------------------------------------------


def test_context_builder_works_without_plan(client: TestClient, testdb: _TestDB) -> None:
    # 不生成任何计划
    context = TutorContextBuilder(testdb.session()).build(TEST_LEARNER_ID, COURSE_OS)

    assert context.plan.has_plan is False
    assert context.plan.plan_id is None
    assert context.plan.tasks == []
    assert "study_plan" not in context.context_used
    # 其余上下文仍可用
    assert context.profile is not None
    assert context.diagnosis is not None


# ---------------------------------------------------------------------------
# Test E：TutorService 调用 LLM Provider（注入记录型 Provider 证明编排链路）
# ---------------------------------------------------------------------------


class _RecordingProvider(BaseLLMProvider):
    """记录收到的 messages / kwargs；返回固定回答。"""

    name = "recording"

    def __init__(self) -> None:
        self.calls: list[tuple[list[LLMMessage], dict]] = []

    async def chat(self, messages: list[LLMMessage], **kwargs) -> LLMResult:
        self.calls.append((messages, kwargs))
        return LLMResult(content="这是小涟的回答。", usage={})


def test_tutor_service_calls_llm_provider(testdb: _TestDB) -> None:
    provider = _RecordingProvider()
    service = TutorService(testdb.session(), llm_provider=provider)
    knowledge = KnowledgeContextBuilder().build(
        COURSE_OS, "给我解释死锁四个必要条件"
    )

    response = _run_chat(service, knowledge=knowledge)

    assert len(provider.calls) == 1
    messages, kwargs = provider.calls[0]
    roles = [m.role for m in messages]
    assert roles == ["system", "user"]
    assert "LEARNER CONTEXT" in messages[1].content
    assert "COURSE KNOWLEDGE" in messages[1].content
    assert "USER QUESTION" in messages[1].content
    assert "四个必要条件" in messages[1].content
    assert kwargs.get("context") is not None
    assert response.answer == "这是小涟的回答。"
    assert response.source == "llm"
    assert "diagnosis" in response.context_used
    assert [source.id for source in response.sources] == [
        item.chunk_id for item in knowledge
    ]


# ---------------------------------------------------------------------------
# Test F：LLM failure → fallback（确定性 + source="fallback" 诚实标记）
# ---------------------------------------------------------------------------


class _FailingProvider(BaseLLMProvider):
    name = "failing"

    async def chat(self, messages: list[LLMMessage], **kwargs) -> LLMResult:
        raise RuntimeError("llm unavailable")


def test_tutor_service_falls_back_on_llm_failure(testdb: _TestDB) -> None:
    service = TutorService(testdb.session(), llm_provider=_FailingProvider())
    knowledge = KnowledgeContextBuilder().build(COURSE_OS, "死锁四个必要条件")

    response = _run_chat(service, knowledge=knowledge)

    assert response.source == "fallback"
    assert "基础辅导" in response.answer
    assert response.answer != ""
    assert response.suggested_actions
    assert "diagnosis" in response.context_used
    assert response.sources
    assert "四个必要条件" in response.answer


# ---------------------------------------------------------------------------
# Test G：API POST /api/tutor/chat 返回结构正确
# ---------------------------------------------------------------------------


def test_chat_api_response_structure(client: TestClient) -> None:
    response = _chat(client)
    assert response.status_code == 200
    body = response.json()

    for key in ("answer", "context_used", "suggested_actions", "source"):
        assert key in body, f"missing field: {key}"
    assert isinstance(body["answer"], str) and body["answer"]
    assert isinstance(body["context_used"], list)
    assert isinstance(body["suggested_actions"], list)
    assert body["source"] in ("llm", "fallback")


# ---------------------------------------------------------------------------
# Test H：非法 message（空 / 空白）→ 422；空 learner_id 也 422
# ---------------------------------------------------------------------------


def test_empty_message_returns_422(client: TestClient) -> None:
    response = _chat(client, message="")
    assert response.status_code == 422


def test_blank_message_returns_422(client: TestClient) -> None:
    response = _chat(client, message="   ")
    assert response.status_code == 422


def test_empty_learner_id_returns_422(client: TestClient) -> None:
    response = _chat(client, learner_id="")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Test I：真实 Demo —— test-learner-001 + course-os + 死锁问题 → 含 diagnosis context
# ---------------------------------------------------------------------------


def test_demo_deadlock_question_uses_diagnosis_context(client: TestClient) -> None:
    response = _chat(client, message="为什么我总学不会死锁？")
    assert response.status_code == 200
    body = response.json()

    assert "diagnosis" in body["context_used"]
    # 回答必须引用真实掌握度（死锁 Seed 基线 46%）
    assert "46%" in body["answer"]


# ---------------------------------------------------------------------------
# 辅助
# ---------------------------------------------------------------------------


def _run_chat(service: TutorService, knowledge=None, assessment=None):
    import asyncio

    request = TutorConversationRequest(
        learner_id=TEST_LEARNER_ID, course_id=COURSE_OS, message=DEMO_MESSAGE
    )
    return asyncio.run(
        service.chat(request, knowledge=knowledge, assessment=assessment)
    )
