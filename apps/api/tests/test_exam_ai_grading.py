from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import get_db
from app.domain import Base
from app.exams import seed_exam_data
from app.exams.ai_grading import AIAnswerGrader
from app.llm.provider import BaseLLMProvider, LLMMessage, LLMResult
from app.llm.unavailable_provider import UnavailableLLMProvider
from app.main import create_app
from tests.seed_fixtures import TEST_LEARNER_ID, seed_test_data


class _FakeProvider(BaseLLMProvider):
    name = "fake-grader"

    async def chat(self, messages: list[LLMMessage], **kwargs) -> LLMResult:
        assert "评分" in messages[0].content
        return LLMResult(
            content=(
                '{"score_ratio": 1.4, "is_correct": true, '
                '"feedback": "覆盖完整，说明了互斥与请求保持。"}'
            ),
            usage={"provider": self.name, "model": "grader-test"},
        )


def test_ai_grader_clamps_model_score_and_preserves_feedback() -> None:
    result = asyncio.run(
        AIAnswerGrader(_FakeProvider()).grade(
            prompt="说明死锁的必要条件",
            reference_answer="互斥、请求与保持、不可剥夺、循环等待",
            keywords=["互斥", "请求与保持", "不可剥夺", "循环等待"],
            student_answer="四个条件都成立才可能死锁。",
        )
    )

    assert result.score_ratio == 1.0
    assert result.is_correct is True
    assert result.feedback == "覆盖完整，说明了互斥与请求保持。"
    assert result.grading_mode == "ai"
    assert result.provider == "fake-grader"


def test_ai_grader_falls_back_to_grounded_keywords() -> None:
    result = asyncio.run(
        AIAnswerGrader(UnavailableLLMProvider()).grade(
            prompt="说明死锁的必要条件",
            reference_answer="互斥、请求与保持、不可剥夺、循环等待",
            keywords=["互斥", "请求与保持", "不可剥夺", "循环等待"],
            student_answer="存在互斥，并且进程请求与保持资源。",
        )
    )

    assert result.score_ratio == 0.5
    assert result.is_correct is False
    assert result.grading_mode == "auto_fallback"
    assert "课程关键词" in result.feedback


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    engine = create_engine(
        f"sqlite:///{tmp_path / 'exam-ai-grading.db'}",
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


def test_generated_ai_question_is_automatically_graded_on_submit(
    client: TestClient,
) -> None:
    generated = client.post(
        "/api/exams/generate",
        json={
            "course_id": "course-os",
            "knowledge_point_ids": ["kp-deadlock"],
            "purpose": "practice",
            "title": "死锁教官练习",
            "question_count": 3,
            "difficulty": 0.7,
            "duration_minutes": 20,
            "publish_immediately": True,
            "include_ai_review_question": True,
        },
    )
    assert generated.status_code == 201, generated.text
    exam = generated.json()["exam"]
    ai_item = next(
        item for item in exam["items"]
        if item["question"]["grading_strategy"] == "ai_semantic"
    )

    started = client.post(
        f"/api/exams/{exam['id']}/attempts",
        json={"learner_id": TEST_LEARNER_ID},
    )
    attempt = started.json()
    for question in attempt["questions"]:
        if question["response_kind"] == "single_choice":
            answer = question["options"][0]
        elif question["response_kind"] == "boolean":
            answer = True
        else:
            answer = "死锁包含互斥、请求与保持等必要条件。"
        saved = client.put(
            f"/api/exams/attempts/{attempt['id']}/answers/{question['question_id']}",
            json={"learner_id": TEST_LEARNER_ID, "answer": answer},
        )
        assert saved.status_code == 200, saved.text

    submitted = client.post(
        f"/api/exams/attempts/{attempt['id']}/submit",
        json={"learner_id": TEST_LEARNER_ID},
    )
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["status"] == "graded"

    result = client.get(
        f"/api/exams/attempts/{attempt['id']}/result",
        params={"learner_id": TEST_LEARNER_ID},
    ).json()
    ai_answer = next(item for item in result["answers"] if item["question_id"] == ai_item["question_id"])
    assert ai_answer["grading_status"] == "auto_fallback"
    assert "课程关键词" in ai_answer["feedback"]
