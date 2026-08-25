from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from tests.seed_fixtures import TEST_LEARNER_ID, seed_test_data
from app.domain import Base
from app.tools import build_tool_registry

COURSE_OS = "course-os"
EXPECTED_NAMES = [
    "get_learner_profile",
    "get_learning_diagnosis",
    "get_current_study_plan",
    "search_course_knowledge",
    "get_recent_learning_evidence",
    "generate_study_plan",
    "replan_study_plan",
]


@pytest.fixture()
def db(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'tools.db'}")
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = factory()
    seed_test_data(session)
    yield session
    session.close()
    engine.dispose()


def execute(db: Session, name: str, **arguments):
    result = build_tool_registry(db).execute(name, arguments)
    assert result.success is True, result.error
    return result.data


def test_catalog_exposes_exact_approved_tools_and_safety_boundaries(db: Session) -> None:
    definitions = build_tool_registry(db).list_tools()

    assert [item.name for item in definitions] == EXPECTED_NAMES
    assert {item.name for item in definitions if not item.read_only} == {
        "generate_study_plan",
        "replan_study_plan",
    }
    assert "evaluate_practice" not in {item.name for item in definitions}


def test_profile_and_diagnosis_tools_use_real_services(db: Session) -> None:
    profile = execute(
        db,
        "get_learner_profile",
        learner_id=TEST_LEARNER_ID,
        course_id=COURSE_OS,
    )
    diagnosis = execute(
        db,
        "get_learning_diagnosis",
        learner_id=TEST_LEARNER_ID,
        course_id=COURSE_OS,
    )

    assert profile["course_name"] == "操作系统"
    assert diagnosis["primary_focus"]["knowledge_point_id"] == "kp-deadlock"


def test_knowledge_and_recent_evidence_tools_return_structured_data(db: Session) -> None:
    knowledge = execute(
        db,
        "search_course_knowledge",
        course_id=COURSE_OS,
        query="PV 操作是什么",
        top_k=2,
    )
    evidence = execute(
        db,
        "get_recent_learning_evidence",
        learner_id=TEST_LEARNER_ID,
        course_id=COURSE_OS,
        limit=5,
    )

    assert knowledge[0]["knowledge_point_id"] == "kp-pv"
    assert evidence == []


def test_plan_tools_preserve_current_and_replanning_lifecycle(db: Session) -> None:
    assert execute(
        db,
        "get_current_study_plan",
        learner_id=TEST_LEARNER_ID,
        course_id=COURSE_OS,
    ) is None
    initial = execute(
        db,
        "generate_study_plan",
        learner_id=TEST_LEARNER_ID,
        course_id=COURSE_OS,
    )
    current = execute(
        db,
        "get_current_study_plan",
        learner_id=TEST_LEARNER_ID,
        course_id=COURSE_OS,
    )
    replanning = execute(
        db,
        "replan_study_plan",
        learner_id=TEST_LEARNER_ID,
        course_id=COURSE_OS,
    )

    assert current["id"] == initial["id"]
    assert replanning["status"] == "not_needed"
    assert replanning["reason_codes"] == ["NO_MATERIAL_CHANGE"]


def test_tool_arguments_are_bounded_by_pydantic_schema(db: Session) -> None:
    registry = build_tool_registry(db)

    knowledge = registry.execute(
        "search_course_knowledge",
        {"course_id": COURSE_OS, "query": "PV", "top_k": 9},
    )
    evidence = registry.execute(
        "get_recent_learning_evidence",
        {"learner_id": TEST_LEARNER_ID, "course_id": COURSE_OS, "limit": 101},
    )

    assert knowledge.error is not None and knowledge.error.code == "INVALID_ARGUMENTS"
    assert evidence.error is not None and evidence.error.code == "INVALID_ARGUMENTS"
