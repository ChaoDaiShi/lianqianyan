from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.db.session import SessionLocal, engine
from app.domain import Base, Course
from app.main import create_app


def _client(monkeypatch) -> TestClient:
    monkeypatch.setenv("EDUCATION_AUTH_REQUIRED", "true")
    get_settings.cache_clear()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        db.add(Course(id="course-os", name="操作系统"))
        db.commit()
    return TestClient(create_app())


def test_companion_threads_persist_messages_and_user_controlled_memory(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        account = client.post(
            "/api/auth/register",
            json={"username": "memory", "display_name": "记忆同学", "password": "Study2026"},
        ).json()["account"]
        client.put("/api/auth/course", json={"course_id": "course-os"})

        created = client.post(
            "/api/companion/threads",
            json={"course_id": "course-os", "title": "死锁复习"},
        )
        assert created.status_code == 201
        thread_id = created.json()["id"]

        message = client.post(
            f"/api/companion/threads/{thread_id}/messages",
            json={"role": "user", "content": "我总是忘记四个必要条件。"},
        )
        assert message.status_code == 200
        source_message_id = message.json()["messages"][0]["id"]

        memory = client.post(
            f"/api/companion/threads/{thread_id}/memories",
            json={"content": "复习时优先用四个必要条件口诀。", "source_message_id": source_message_id},
        )
        assert memory.status_code == 200
        assert memory.json()["memories"][0]["content"].startswith("复习时")

        listed = client.get("/api/companion/threads", params={"course_id": "course-os"})
        assert listed.status_code == 200
        assert listed.json()[0]["message_count"] == 1
        assert listed.json()[0]["memory_count"] == 1
        assert listed.json()[0]["account_id"] == account["id"]


def test_companion_thread_rejects_wrong_course_and_oversized_memory(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        client.post(
            "/api/auth/register",
            json={"username": "bounded", "display_name": "边界同学", "password": "Study2026"},
        )
        client.put("/api/auth/course", json={"course_id": "course-os"})
        wrong = client.post(
            "/api/companion/threads",
            json={"course_id": "other-course", "title": "错误课程"},
        )
        assert wrong.status_code == 403

        thread = client.post(
            "/api/companion/threads",
            json={"course_id": "course-os", "title": "边界"},
        ).json()
        oversized = client.post(
            f"/api/companion/threads/{thread['id']}/memories",
            json={"content": "记" * 501},
        )
        assert oversized.status_code == 422
