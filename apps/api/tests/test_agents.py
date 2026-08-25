from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.agents import (
    AgentCapability,
    AgentRequest,
    AssessmentAgent,
    AgentRouter,
    DiagnosisAgent,
    EducationAgentOrchestrator,
    PlannerAgent,
    RouteDecision,
)
from tests.seed_fixtures import TEST_LEARNER_ID, seed_test_data
from app.db.session import get_db
from app.domain import Base
from app.main import create_app

COURSE_OS = "course-os"


class _TestDB:
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
    db = _TestDB(str(tmp_path / "agents_test.db"))
    with db.session() as session:
        seed_test_data(session)
    yield db
    db.engine.dispose()


@pytest.fixture()
def client(testdb: _TestDB) -> TestClient:
    app = create_app()

    def override_get_db():
        session = testdb.session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app, raise_server_exceptions=False)


def request(message: str, capability: AgentCapability | None = None) -> AgentRequest:
    return AgentRequest(
        learner_id=TEST_LEARNER_ID,
        course_id=COURSE_OS,
        message=message,
        capability=capability,
    )


def agent_chat(client: TestClient, message: str, capability: str | None = None):
    return client.post(
        "/api/agents/chat",
        json={
            "learner_id": TEST_LEARNER_ID,
            "course_id": COURSE_OS,
            "message": message,
            "capability": capability,
        },
    )


def test_router_routes_standard_messages() -> None:
    router = AgentRouter()
    assert router.route("我哪里薄弱", None) == RouteDecision(AgentCapability.DIAGNOSIS)
    assert router.route("今天学什么", None) == RouteDecision(AgentCapability.PLANNING)
    assert router.route("为什么这题错了", None) == RouteDecision(AgentCapability.ASSESSMENT)
    assert router.route("解释死锁", None) == RouteDecision(AgentCapability.TUTORING)
    assert router.route("随便聊聊", None) == RouteDecision(AgentCapability.TUTORING)


def test_router_prioritizes_collaboration_and_explicit_capability() -> None:
    router = AgentRouter()
    assert router.route("我现在最应该学什么，为什么？", None) == RouteDecision(
        AgentCapability.PLANNING, collaborative=True
    )
    assert router.route("解释死锁", AgentCapability.DIAGNOSIS) == RouteDecision(
        AgentCapability.DIAGNOSIS
    )


def test_diagnosis_agent_reuses_service_result(testdb: _TestDB) -> None:
    result = DiagnosisAgent(testdb.session()).run(request("我哪里薄弱"))
    assert result.success is True
    assert result.data["diagnosis"]["primary_focus"]["knowledge_point_id"] == "kp-deadlock"


def test_planner_ordinary_question_reads_without_generating(testdb: _TestDB, monkeypatch) -> None:
    agent = PlannerAgent(testdb.session())
    original_execute = agent._tools.execute

    def execute_read_only(name, arguments):
        if name == "generate_study_plan":
            pytest.fail("ordinary planner question must not write")
        return original_execute(name, arguments)

    monkeypatch.setattr(agent._tools, "execute", execute_read_only)
    result = agent.run(request("我今天学什么"))
    assert result.success is True
    assert result.data["plan"] is None
    assert [item.name for item in result.tool_trace] == ["get_current_study_plan"]


def test_assessment_agent_is_read_only(testdb: _TestDB) -> None:
    result = AssessmentAgent(testdb.session()).run(request("分析一下我刚才的练习"))
    assert result.success is True
    assert result.data["evidence"] is None
    assert "目前还没有足够记录" in result.summary


def test_assessment_agent_explains_real_projection_without_writing_mastery(testdb: _TestDB) -> None:
    from app.domain import PracticeEvaluateRequest
    from app.services import PracticeEvaluationService
    from app.services.mastery_repository import MasteryRepository

    session = testdb.session()
    before = MasteryRepository(session).get_by_learner_and_knowledge_point(
        TEST_LEARNER_ID, "kp-pv"
    )
    assert before is not None
    response = PracticeEvaluationService(session).evaluate(
        PracticeEvaluateRequest(
            learner_id=TEST_LEARNER_ID,
            course_id=COURSE_OS,
            knowledge_point_id="kp-pv",
            question_id="q-assessment-agent",
            is_correct=True,
            score=1.0,
            difficulty=0.6,
        )
    )
    after_practice = MasteryRepository(session).get_by_learner_and_knowledge_point(
        TEST_LEARNER_ID, "kp-pv"
    )
    assert after_practice is not None
    assessment = AssessmentAgent(session).run(request("分析一下我刚才的练习"))
    assert assessment.data["mastery_before"] == response.mastery_before
    assert assessment.data["mastery_after"] == response.mastery_after
    assert assessment.data["confidence"] == response.confidence
    assert assessment.data["evidence_count"] == response.evidence_count

    before_chat = (after_practice.mastery_score, after_practice.evidence_count)
    assessment_again = AssessmentAgent(session).run(request("分析一下我刚才的练习"))
    after_chat = MasteryRepository(session).get_by_learner_and_knowledge_point(
        TEST_LEARNER_ID, "kp-pv"
    )
    assert after_chat is not None
    assert (after_chat.mastery_score, after_chat.evidence_count) == before_chat
    assert assessment_again.success is True


def test_orchestrator_collaboration_trace_is_dag(client: TestClient) -> None:
    response = agent_chat(client, "我现在最应该学什么，为什么？")
    assert response.status_code == 200
    body = response.json()
    assert [item["agent"] for item in body["agent_trace"]] == [
        "diagnosis",
        "get_learning_diagnosis",
        "planning",
        "get_current_study_plan",
        "search_course_knowledge",
        "tutoring",
    ]
    assert [item["type"] for item in body["agent_trace"]] == [
        "agent",
        "tool",
        "agent",
        "tool",
        "tool",
        "agent",
    ]
    assert body["agent_trace"][1]["name"] == "get_learning_diagnosis"
    assert body["sources"]
    assert body["agent_trace"][-1]["status"] == "completed"
    assert body["provider"] == "mock"


def test_tutoring_request_has_no_fake_planner_trace(client: TestClient) -> None:
    body = agent_chat(client, "给我解释死锁四个必要条件。").json()
    assert body["selected_capability"] == "tutoring"
    assert [item["agent"] for item in body["agent_trace"]] == [
        "search_course_knowledge",
        "tutoring",
    ]
    assert body["sources"]
    assert all(source["knowledge_point_id"] == "kp-deadlock" for source in body["sources"])


def test_explicit_capability_is_honored(client: TestClient) -> None:
    body = agent_chat(client, "解释死锁", "diagnosis").json()
    assert body["selected_capability"] == "diagnosis"
    assert [item["agent"] for item in body["agent_trace"]] == [
        "diagnosis",
        "get_learning_diagnosis",
    ]


def test_agents_api_rejects_blank_message(client: TestClient) -> None:
    assert agent_chat(client, "   ").status_code == 422


def test_assessment_api_uses_assessment_capability(client: TestClient) -> None:
    body = agent_chat(client, "分析一下我刚才的练习").json()
    assert body["selected_capability"] == "assessment"
    assert [item["agent"] for item in body["agent_trace"]] == [
        "assessment",
        "get_recent_learning_evidence",
    ]
    assert body["sources"] == []


def test_assessment_with_real_evidence_is_grounded_and_read_only(testdb: _TestDB) -> None:
    from app.domain import PracticeEvaluateRequest
    from app.llm.provider import BaseLLMProvider, LLMMessage, LLMResult
    from app.services import PracticeEvaluationService
    from app.services.mastery_repository import MasteryRepository

    class RecordingProvider(BaseLLMProvider):
        name = "recording"

        def __init__(self) -> None:
            self.messages: list[LLMMessage] = []
            self.calls = 0

        async def chat(self, messages: list[LLMMessage], **kwargs) -> LLMResult:
            self.calls += 1
            self.messages = messages
            return LLMResult(content="基于证据与课程材料的错因解释。")

    session = testdb.session()
    PracticeEvaluationService(session).evaluate(
        PracticeEvaluateRequest(
            learner_id=TEST_LEARNER_ID,
            course_id=COURSE_OS,
            knowledge_point_id="kp-deadlock",
            question_id="q-deadlock-grounding",
            is_correct=False,
            score=0.0,
            difficulty=0.7,
        )
    )
    mastery = MasteryRepository(session).get_by_learner_and_knowledge_point(
        TEST_LEARNER_ID, "kp-deadlock"
    )
    assert mastery is not None
    before_chat = (mastery.mastery_score, mastery.evidence_count)
    provider = RecordingProvider()

    response = asyncio.run(
        EducationAgentOrchestrator(session, llm_provider=provider).handle(
            request("分析一下我刚才为什么错")
        )
    )

    assert provider.calls == 1
    assert "ASSESSMENT EVIDENCE" in provider.messages[1].content
    assert "COURSE KNOWLEDGE" in provider.messages[1].content
    assert [item.agent for item in response.agent_trace] == [
        AgentCapability.ASSESSMENT,
        "get_recent_learning_evidence",
        "search_course_knowledge",
        AgentCapability.TUTORING,
    ]
    assert response.sources
    after_chat = MasteryRepository(session).get_by_learner_and_knowledge_point(
        TEST_LEARNER_ID, "kp-deadlock"
    )
    assert after_chat is not None
    assert (after_chat.mastery_score, after_chat.evidence_count) == before_chat


def test_orchestrator_has_no_agent_loop(testdb: _TestDB) -> None:
    response = asyncio.run(EducationAgentOrchestrator(testdb.session()).handle(request("解释死锁")))
    assert [item.agent for item in response.agent_trace] == [
        "search_course_knowledge",
        AgentCapability.TUTORING,
    ]


def test_learning_space_context_retrieves_implicit_deadlock_question(testdb: _TestDB) -> None:
    grounded_request = AgentRequest(
        learner_id=TEST_LEARNER_ID,
        course_id=COURSE_OS,
        knowledge_point_id="kp-deadlock",
        message="四个条件怎么记？",
    )

    response = asyncio.run(
        EducationAgentOrchestrator(testdb.session()).handle(grounded_request)
    )

    assert response.sources
    assert response.sources[0].knowledge_point_id == "kp-deadlock"
    assert [item.agent for item in response.agent_trace] == [
        "search_course_knowledge",
        AgentCapability.TUTORING,
    ]
