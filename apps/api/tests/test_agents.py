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
    DiagnosisAgent,
    EducationAgentOrchestrator,
    PlannerAgent,
)
from app.core.seed import DEMO_LEARNER_ID, seed_demo_data
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
        seed_demo_data(session)
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
        learner_id=DEMO_LEARNER_ID,
        course_id=COURSE_OS,
        message=message,
        capability=capability,
    )


def agent_chat(client: TestClient, message: str, capability: str | None = None):
    return client.post(
        "/api/agents/chat",
        json={
            "learner_id": DEMO_LEARNER_ID,
            "course_id": COURSE_OS,
            "message": message,
            "capability": capability,
        },
    )


def test_diagnosis_agent_reuses_service_result(testdb: _TestDB) -> None:
    result = DiagnosisAgent(testdb.session()).run(request("我哪里薄弱"))
    assert result.success is True
    assert result.data["diagnosis"]["primary_focus"]["knowledge_point_id"] == "kp-deadlock"


def test_planner_ordinary_question_reads_without_generating(testdb: _TestDB, monkeypatch) -> None:
    agent = PlannerAgent(testdb.session())
    monkeypatch.setattr(
        agent._application,
        "generate_plan",
        lambda *_: pytest.fail("ordinary planner question must not write"),
    )
    result = agent.run(request("我今天学什么"))
    assert result.success is True
    assert result.data["plan"] is None


def test_assessment_agent_is_read_only(testdb: _TestDB) -> None:
    result = AssessmentAgent(testdb.session()).run(request("分析一下我刚才的练习"))
    assert result.success is True
    assert result.data["evidence"] is None
    assert "目前还没有足够记录" in result.summary


def test_orchestrator_collaboration_trace_is_dag(client: TestClient) -> None:
    response = agent_chat(client, "我现在最应该学什么，为什么？")
    assert response.status_code == 200
    body = response.json()
    assert [item["agent"] for item in body["agent_trace"]] == [
        "diagnosis",
        "planning",
        "tutoring",
    ]
    assert body["agent_trace"][-1]["status"] == "completed"
    assert body["provider"] == "mock"


def test_tutoring_request_has_no_fake_planner_trace(client: TestClient) -> None:
    body = agent_chat(client, "给我解释死锁四个必要条件。").json()
    assert body["selected_capability"] == "tutoring"
    assert [item["agent"] for item in body["agent_trace"]] == ["tutoring"]


def test_explicit_capability_is_honored(client: TestClient) -> None:
    body = agent_chat(client, "解释死锁", "diagnosis").json()
    assert body["selected_capability"] == "diagnosis"
    assert [item["agent"] for item in body["agent_trace"]] == ["diagnosis"]


def test_agents_api_rejects_blank_message(client: TestClient) -> None:
    assert agent_chat(client, "   ").status_code == 422


def test_assessment_api_uses_assessment_capability(client: TestClient) -> None:
    body = agent_chat(client, "分析一下我刚才的练习").json()
    assert body["selected_capability"] == "assessment"
    assert [item["agent"] for item in body["agent_trace"]] == ["assessment"]


def test_orchestrator_has_no_agent_loop(testdb: _TestDB) -> None:
    response = asyncio.run(EducationAgentOrchestrator(testdb.session()).handle(request("解释死锁")))
    assert [item.agent for item in response.agent_trace] == [AgentCapability.TUTORING]
