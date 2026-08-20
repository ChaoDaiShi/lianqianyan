from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.seed import DEMO_LEARNER_ID, seed_demo_data
from app.db.session import get_db
from app.domain import Base
from app.main import create_app
from app.tools import build_tool_registry

COURSE_OS = "course-os"


@pytest.fixture()
def api_context(tmp_path: Path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'tools_api.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    with factory() as session:
        seed_demo_data(session)

    app = create_app()

    def override_get_db():
        with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app), factory
    engine.dispose()


def test_tools_catalog_is_backed_by_registry(api_context) -> None:
    client, factory = api_context
    response = client.get("/api/tools")

    assert response.status_code == 200
    body = response.json()
    with factory() as db:
        expected = [
            item.model_dump(mode="json")
            for item in build_tool_registry(db).list_tools()
        ]
    assert body == expected
    assert all("input_schema" in item for item in body)
    assert "evaluate_practice" not in {item["name"] for item in body}


def test_diagnosis_tool_matches_http_application_service_result(api_context) -> None:
    client, factory = api_context
    http = client.get(
        f"/api/diagnosis/{DEMO_LEARNER_ID}",
        params={"course_id": COURSE_OS},
    ).json()
    with factory() as db:
        tool = build_tool_registry(db).execute(
            "get_learning_diagnosis",
            {"learner_id": DEMO_LEARNER_ID, "course_id": COURSE_OS},
        )

    assert tool.success is True
    assert isinstance(tool.data, dict)
    tool_data = dict(tool.data)
    tool_data.pop("diagnosis_generated_at")
    http.pop("diagnosis_generated_at")
    assert tool_data == http
