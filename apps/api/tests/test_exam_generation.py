from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import get_db
from app.domain import Base
from app.exams import seed_exam_data
from app.main import create_app
from tests.seed_fixtures import seed_test_data


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    engine = create_engine(
        f"sqlite:///{tmp_path / 'exam-generation.db'}",
        connect_args={"check_same_thread": False},
    )
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)
    with factory() as db:
        seed_test_data(db)
        seed_exam_data(db)

    app = create_app()

    def override_get_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    test_client.close()
    engine.dispose()


def test_generate_practice_creates_published_grounded_exam(client: TestClient) -> None:
    response = client.post(
        "/api/exams/generate",
        json={
            "course_id": "course-os",
            "knowledge_point_ids": ["kp-deadlock"],
            "purpose": "practice",
            "title": "死锁专项练习",
            "question_count": 3,
            "difficulty": 0.6,
            "duration_minutes": 20,
            "publish_immediately": True,
            "include_ai_review_question": False,
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["exam"]["title"] == "死锁专项练习"
    assert body["exam"]["status"] == "published"
    assert len(body["exam"]["items"]) == 3
    assert body["generation_mode"] in {"llm", "course_grounded"}
    assert body["source_sections"]
    assert all(item["question"]["explanation"] for item in body["exam"]["items"])

    listed = client.get("/api/exams/questions", params={"course_id": "course-os"})
    assert listed.status_code == 200
    assert len(listed.json()) == 3


def test_generate_exam_rejects_unknown_knowledge_point_without_partial_writes(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/exams/generate",
        json={
            "course_id": "course-os",
            "knowledge_point_ids": ["kp-unknown"],
            "purpose": "exam",
            "title": "无效试卷",
            "question_count": 3,
            "difficulty": 0.5,
            "duration_minutes": 30,
            "publish_immediately": False,
            "include_ai_review_question": False,
        },
    )

    assert response.status_code == 404
    listed = client.get("/api/exams/questions", params={"course_id": "course-os"})
    assert listed.json() == []


@pytest.mark.parametrize("question_count", [4, 5])
def test_generated_text_graders_accept_their_own_grounded_reference_answers(
    client: TestClient, question_count: int
) -> None:
    response = client.post(
        "/api/exams/generate",
        json={
            "course_id": "course-os",
            "knowledge_point_ids": ["kp-deadlock"],
            "purpose": "practice",
            "title": f"判卷契约验证 {question_count}",
            "question_count": question_count,
            "difficulty": 0.6,
            "duration_minutes": 20,
            "publish_immediately": True,
            "include_ai_review_question": True,
        },
    )

    assert response.status_code == 201, response.text
    text_questions = [
        item["question"]
        for item in response.json()["exam"]["items"]
        if item["question"]["grading_strategy"] in {"keyword", "ai_semantic"}
    ]
    assert text_questions
    for question in text_questions:
        assert isinstance(question["correct_answer"], str)
        assert question["keywords"]
        assert any(
            keyword.casefold() in question["correct_answer"].casefold()
            for keyword in question["keywords"]
        )
