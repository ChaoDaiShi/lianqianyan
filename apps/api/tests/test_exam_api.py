from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.seed import DEMO_LEARNER_ID, seed_demo_data
from app.db.session import get_db
from app.domain import Base
from app.exams import seed_exam_data
from app.main import create_app

COURSE_ID = "course-os"
LEARNER_ID = DEMO_LEARNER_ID


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    engine = create_engine(
        f"sqlite:///{tmp_path / 'exam-api.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as db:
        seed_demo_data(db)
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


def _create_question(
    client: TestClient,
    *,
    question_type_id: str = "type-single-choice",
    prompt: str = "死锁的必要条件是？",
    options: list[str] | None = None,
    correct_answer="互斥",
    knowledge_point_id: str = "kp-deadlock",
) -> dict:
    response = client.post(
        "/api/exams/questions",
        json={
            "course_id": COURSE_ID,
            "knowledge_point_id": knowledge_point_id,
            "question_type_id": question_type_id,
            "prompt": prompt,
            "options": options if options is not None else ["互斥", "可抢占", "无限资源"],
            "correct_answer": correct_answer,
            "keywords": [],
            "explanation": "互斥是四个必要条件之一。",
            "difficulty": 0.6,
            "default_score": 10,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _create_published_exam(client: TestClient, question_ids: list[str]) -> dict:
    response = client.post(
        "/api/exams",
        json={
            "course_id": COURSE_ID,
            "title": "操作系统阶段测评",
            "description": "真实考试 API 验证",
            "duration_minutes": 30,
            "pass_percentage": 60,
            "shuffle_questions": False,
            "items": [
                {"question_id": question_id, "points": 10, "position": index}
                for index, question_id in enumerate(question_ids, start=1)
            ],
        },
    )
    assert response.status_code == 201, response.text
    exam = response.json()
    published = client.post(f"/api/exams/{exam['id']}/publish")
    assert published.status_code == 200, published.text
    return published.json()


def test_question_type_api_seeds_builtins_and_creates_custom_type(client: TestClient) -> None:
    initial = client.get("/api/exams/question-types")
    assert initial.status_code == 200
    assert {item["id"] for item in initial.json()} >= {
        "type-single-choice",
        "type-multiple-choice",
        "type-boolean",
        "type-keyword-short",
        "type-manual-long",
    }

    created = client.post(
        "/api/exams/question-types",
        json={
            "name": "口述概念题",
            "description": "可用语音转写回答",
            "response_kind": "short_text",
            "grading_strategy": "manual",
        },
    )
    assert created.status_code == 201
    assert created.json()["is_builtin"] is False

    duplicate = client.post(
        "/api/exams/question-types",
        json={
            "name": " 口述概念题 ",
            "response_kind": "short_text",
            "grading_strategy": "manual",
        },
    )
    assert duplicate.status_code == 409
    incompatible = client.post(
        "/api/exams/question-types",
        json={
            "name": "危险题型",
            "response_kind": "single_choice",
            "grading_strategy": "manual",
        },
    )
    assert incompatible.status_code == 422


def test_question_bank_api_validates_and_lists_authoring_answers(client: TestClient) -> None:
    question = _create_question(client)
    listed = client.get("/api/exams/questions", params={"course_id": COURSE_ID})

    assert listed.status_code == 200
    assert listed.json()[0]["id"] == question["id"]
    assert listed.json()[0]["correct_answer"] == "互斥"

    invalid = client.post(
        "/api/exams/questions",
        json={
            "course_id": COURSE_ID,
            "knowledge_point_id": "kp-does-not-exist",
            "question_type_id": "type-single-choice",
            "prompt": "无效题目",
            "options": ["A", "B"],
            "correct_answer": "A",
            "difficulty": 0.5,
            "default_score": 5,
        },
    )
    assert invalid.status_code == 422
    assert invalid.json() == {"detail": "knowledge point does not belong to course"}


def test_exam_attempt_contract_keeps_answers_private_until_result(client: TestClient) -> None:
    question = _create_question(client)
    exam = _create_published_exam(client, [question["id"]])

    catalog = client.get(
        "/api/exams/catalog",
        params={"course_id": COURSE_ID, "learner_id": LEARNER_ID},
    )
    assert catalog.status_code == 200
    assert catalog.json()[0]["question_count"] == 1
    assert catalog.json()[0]["latest_attempt"] is None

    started = client.post(
        f"/api/exams/{exam['id']}/attempts",
        json={"learner_id": LEARNER_ID},
    )
    assert started.status_code == 201
    attempt = started.json()
    serialized = str(attempt)
    assert "correct_answer" not in serialized
    assert "keywords" not in serialized
    assert "explanation" not in serialized

    resumed = client.post(
        f"/api/exams/{exam['id']}/attempts",
        json={"learner_id": LEARNER_ID},
    )
    assert resumed.status_code == 201
    assert resumed.json()["id"] == attempt["id"]

    saved = client.put(
        f"/api/exams/attempts/{attempt['id']}/answers/{question['id']}",
        json={"learner_id": LEARNER_ID, "answer": "互斥"},
    )
    assert saved.status_code == 200
    submitted = client.post(
        f"/api/exams/attempts/{attempt['id']}/submit",
        json={"learner_id": LEARNER_ID},
    )
    assert submitted.status_code == 200
    assert submitted.json()["percentage"] == 100

    result = client.get(
        f"/api/exams/attempts/{attempt['id']}/result",
        params={"learner_id": LEARNER_ID},
    )
    assert result.status_code == 200
    assert result.json()["answers"][0]["correct_answer"] == "互斥"
    assert result.json()["answers"][0]["explanation"].startswith("互斥")

    locked = client.patch(
        f"/api/exams/{exam['id']}",
        json={"title": "不允许修改"},
    )
    assert locked.status_code == 409


def test_manual_review_result_history_and_analytics(client: TestClient) -> None:
    custom_type = client.post(
        "/api/exams/question-types",
        json={
            "name": "人工解释题",
            "response_kind": "long_text",
            "grading_strategy": "manual",
        },
    ).json()
    manual_question = _create_question(
        client,
        question_type_id=custom_type["id"],
        prompt="解释死锁避免。",
        options=[],
        correct_answer="根据安全状态决定是否分配资源。",
    )
    exam = _create_published_exam(client, [manual_question["id"]])
    attempt = client.post(
        f"/api/exams/{exam['id']}/attempts",
        json={"learner_id": LEARNER_ID},
    ).json()
    client.put(
        f"/api/exams/attempts/{attempt['id']}/answers/{manual_question['id']}",
        json={"learner_id": LEARNER_ID, "answer": "只在安全状态下分配。"},
    )
    submitted = client.post(
        f"/api/exams/attempts/{attempt['id']}/submit",
        json={"learner_id": LEARNER_ID},
    )
    assert submitted.json()["status"] == "needs_review"

    queue = client.get("/api/exams/review-queue", params={"course_id": COURSE_ID})
    assert queue.status_code == 200
    assert len(queue.json()) == 1
    graded = client.patch(
        f"/api/exams/answers/{queue.json()[0]['answer_id']}/grade",
        json={"score": 8, "feedback": "核心判断正确。"},
    )
    assert graded.status_code == 200
    assert graded.json()["status"] == "graded"
    assert graded.json()["percentage"] == 80

    history = client.get(
        "/api/exams/results",
        params={"course_id": COURSE_ID, "learner_id": LEARNER_ID},
    )
    assert history.status_code == 200
    assert history.json()[0]["id"] == attempt["id"]

    analytics = client.get(
        "/api/exams/analytics",
        params={"course_id": COURSE_ID, "learner_id": LEARNER_ID},
    )
    assert analytics.status_code == 200
    body = analytics.json()
    assert body["submitted_count"] == 1
    assert body["graded_count"] == 1
    assert body["average_percentage"] == 80
    assert body["best_percentage"] == 80
    assert body["pass_rate"] == 1
    assert body["pending_review_count"] == 0
    assert body["knowledge_points"][0]["knowledge_point_id"] == "kp-deadlock"
    assert body["knowledge_points"][0]["average_score_ratio"] == 0.8


def test_empty_exam_analytics_use_null_performance_instead_of_fake_zero(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/exams/analytics",
        params={"course_id": COURSE_ID, "learner_id": "new-learner"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "learner_id": "new-learner",
        "course_id": COURSE_ID,
        "submitted_count": 0,
        "graded_count": 0,
        "average_percentage": None,
        "best_percentage": None,
        "pass_rate": None,
        "objective_accuracy": None,
        "pending_review_count": 0,
        "knowledge_points": [],
    }
