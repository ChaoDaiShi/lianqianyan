from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.seed import DEMO_LEARNER_ID, seed_demo_data
from app.db.session import get_db
from app.domain import Base, ReplanningReasonCode, StudyPlan, StudyPlanStatus
from app.main import create_app
from app.services.dynamic_replanning_service import DynamicReplanningService
from app.services.study_plan_application_service import StudyPlanApplicationService

COURSE_OS = "course-os"


@pytest.fixture()
def session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'dynamic.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = factory()
    seed_demo_data(db)
    yield db
    db.close()
    engine.dispose()


def test_no_active_plan_returns_no_active_and_does_not_create(session: Session) -> None:
    result = DynamicReplanningService(session).replan(DEMO_LEARNER_ID, COURSE_OS)
    assert result.performed is False
    assert result.reason_codes == [ReplanningReasonCode.NO_ACTIVE_PLAN]
    assert session.query(StudyPlan).count() == 0


def test_unchanged_candidate_keeps_current_plan(session: Session) -> None:
    application = StudyPlanApplicationService(session)
    current = application.generate_plan(DEMO_LEARNER_ID, COURSE_OS)
    result = DynamicReplanningService(session).replan(DEMO_LEARNER_ID, COURSE_OS)
    assert result.performed is False
    assert result.reason_codes == [ReplanningReasonCode.NO_MATERIAL_CHANGE]
    assert result.previous_plan_id == current.id
    assert session.query(StudyPlan).count() == 1


def test_explicit_replan_api_returns_contract(session: Session) -> None:
    StudyPlanApplicationService(session).generate_plan(DEMO_LEARNER_ID, COURSE_OS)
    app = create_app()

    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app, raise_server_exceptions=False)
    response = client.post(
        "/api/plans/replan",
        json={"learner_id": DEMO_LEARNER_ID, "course_id": COURSE_OS},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "not_needed"
    assert body["performed"] is False
    assert body["reason_codes"] == ["NO_MATERIAL_CHANGE"]
    assert body["previous_plan_id"]
    assert body["new_plan"] is None
