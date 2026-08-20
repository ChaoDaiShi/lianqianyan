from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.routes import practice as practice_routes
from app.core.seed import DEMO_LEARNER_ID, seed_demo_data
from app.db.session import get_db
from app.domain import Base, LearningEvidence, MasteryRecord, StudyPlan, StudyPlanStatus
from app.main import create_app
from app.services.dynamic_replanning_service import DynamicReplanningService
from app.services.practice_evaluation_service import PracticeEvaluationService
from app.services.study_plan_application_service import StudyPlanApplicationService

COURSE_OS = "course-os"


@pytest.fixture()
def factory(tmp_path: Path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'practice-replan.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    with session_factory() as db:
        seed_demo_data(db)
    yield session_factory
    engine.dispose()


def _payload() -> dict:
    return {
        "learner_id": DEMO_LEARNER_ID,
        "course_id": COURSE_OS,
        "knowledge_point_id": "kp-deadlock",
        "question_id": "q-deadlock-threshold",
        "is_correct": True,
        "score": 1.0,
        "difficulty": 0.6,
    }


def _client(factory, service_factory=None, *, raise_server_exceptions: bool = False) -> TestClient:
    app = create_app()

    def override_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    if service_factory:
        app.dependency_overrides[practice_routes._service] = service_factory
    return TestClient(app, raise_server_exceptions=raise_server_exceptions)


def test_practice_crosses_threshold_and_replans_current(factory) -> None:
    with factory() as db:
        old_plan = StudyPlanApplicationService(db).generate_plan(DEMO_LEARNER_ID, COURSE_OS)
        assert old_plan.tasks[0].knowledge_point_id == "kp-deadlock"
        assert old_plan.tasks[0].action_type.value == "remediate"

    response = _client(factory).post("/api/practice/evaluate", json=_payload())
    assert response.status_code == 200
    body = response.json()
    assert body["mastery_before"] == pytest.approx(0.46)
    assert body["mastery_after"] == pytest.approx(0.515)
    assert body["replanning"]["status"] == "performed"
    assert body["replanning"]["performed"] is True
    assert "TASK_ACTION_CHANGED" in body["replanning"]["reason_codes"]
    assert body["replanning"]["previous_plan_id"] == old_plan.id
    assert body["replanning"]["new_plan"]["id"] != old_plan.id
    assert body["replanning"]["new_top_task"]["action_type"] == "assess"

    with factory() as db:
        old = db.get(StudyPlan, old_plan.id)
        current = StudyPlanApplicationService(db).get_current(DEMO_LEARNER_ID, COURSE_OS)
        assert old is not None and old.status == StudyPlanStatus.SUPERSEDED.value
        assert current is not None and current.id == body["replanning"]["new_plan"]["id"]
        deadlock = next(task for task in current.tasks if task.knowledge_point_id == "kp-deadlock")
        assert deadlock.action_type.value == "strengthen"


def test_practice_without_active_plan_does_not_generate(factory) -> None:
    response = _client(factory).post("/api/practice/evaluate", json=_payload())
    assert response.status_code == 200
    assert response.json()["replanning"]["reason_codes"] == ["NO_ACTIVE_PLAN"]
    with factory() as db:
        assert db.query(StudyPlan).count() == 0


class _FailingReplanningService(DynamicReplanningService):
    def replan(self, learner_id: str, course_id: str):
        raise RuntimeError("planned failure")


def test_replanning_failure_keeps_practice_committed(factory) -> None:
    with factory() as db:
        old_plan = StudyPlanApplicationService(db).generate_plan(DEMO_LEARNER_ID, COURSE_OS)

    def failing_service(db: Session = Depends(get_db)):
        return PracticeEvaluationService(db, replanning_service=_FailingReplanningService(db))

    response = _client(factory, failing_service, raise_server_exceptions=True).post(
        "/api/practice/evaluate", json=_payload()
    )
    assert response.status_code == 200
    assert response.json()["replanning"]["status"] == "failed"

    with factory() as db:
        mastery = db.query(MasteryRecord).filter_by(
            learner_id=DEMO_LEARNER_ID, knowledge_point_id="kp-deadlock"
        ).one()
        assert mastery.mastery_score == pytest.approx(0.515)
        assert db.query(LearningEvidence).filter_by(question_id="q-deadlock-threshold").count() == 1
        old = db.get(StudyPlan, old_plan.id)
        assert old is not None and old.status == StudyPlanStatus.ACTIVE.value
        assert db.query(StudyPlan).count() == 1
