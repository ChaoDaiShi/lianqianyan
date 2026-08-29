from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.auth.models import AuthAccount, AuthSession
from app.core.config import get_settings
from app.db.session import SessionLocal, engine
from app.domain import Base, Course, LearningEvidence, StudyPlan, User
from app.main import create_app


def _client(monkeypatch) -> TestClient:
    monkeypatch.setenv("EDUCATION_AUTH_REQUIRED", "true")
    get_settings.cache_clear()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        db.add(Course(id="course-os", name="操作系统", description="课程"))
        db.commit()
    return TestClient(create_app())


def _register(client: TestClient, username: str = "xiaolian"):
    return client.post(
        "/api/auth/register",
        json={
            "username": username,
            "display_name": "小涟同学",
            "password": "Study2026",
        },
    )


def test_register_creates_account_session_and_empty_learner(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        response = _register(client)
        assert response.status_code == 201
        body = response.json()
        assert body["account"]["username"] == "xiaolian"
        assert body["account"]["selected_course_id"] is None
        assert client.cookies.get("educationmind_session")

        with SessionLocal() as db:
            account_id = body["account"]["id"]
            assert db.get(User, account_id) is not None
            assert db.scalar(select(func.count()).select_from(StudyPlan)) == 0
            assert db.scalar(select(func.count()).select_from(LearningEvidence)) == 0
            assert db.scalar(select(func.count()).select_from(AuthSession)) == 1


def test_register_rejects_duplicate_username_case_insensitively(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        assert _register(client, "XiaoLian").status_code == 201
        response = _register(client, "xiaolian")
        assert response.status_code == 409


def test_register_rejects_weak_password(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        response = client.post(
            "/api/auth/register",
            json={"username": "student", "display_name": "学生", "password": "password"},
        )
        assert response.status_code == 422


def test_login_session_course_selection_and_logout(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        registered = _register(client).json()
        account_id = registered["account"]["id"]
        assert client.get("/api/auth/session").status_code == 200

        selected = client.put("/api/auth/course", json={"course_id": "course-os"})
        assert selected.status_code == 200
        assert selected.json()["selected_course_id"] == "course-os"

        assert client.post("/api/auth/logout").status_code == 204
        assert client.get("/api/auth/session").status_code == 401

        bad = client.post(
            "/api/auth/login", json={"username": "xiaolian", "password": "wrong2026"}
        )
        assert bad.status_code == 401
        login = client.post(
            "/api/auth/login", json={"username": "XIAOLIAN", "password": "Study2026"}
        )
        assert login.status_code == 200
        assert login.json()["account"]["id"] == account_id
        assert login.json()["account"]["selected_course_id"] == "course-os"


def test_course_selection_rejects_unknown_course(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        _register(client)
        response = client.put("/api/auth/course", json={"course_id": "missing"})
        assert response.status_code == 404


def test_login_locks_after_five_failures(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        _register(client)
        client.post("/api/auth/logout")
        for _ in range(5):
            response = client.post(
                "/api/auth/login",
                json={"username": "xiaolian", "password": "wrong2026"},
            )
            assert response.status_code == 401
        locked = client.post(
            "/api/auth/login", json={"username": "xiaolian", "password": "Study2026"}
        )
        assert locked.status_code == 423
        with SessionLocal() as db:
            account = db.scalar(select(AuthAccount).where(AuthAccount.username == "xiaolian"))
            assert account is not None and account.locked_until is not None


def test_business_api_requires_login_and_enforces_learner_course_scope(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        assert client.get("/api/knowledge/graph").status_code == 401
        account = _register(client).json()["account"]
        before_course = client.get(
            f"/api/profile/{account['id']}", params={"course_id": "course-os"}
        )
        assert before_course.status_code == 409

        client.put("/api/auth/course", json={"course_id": "course-os"})
        own = client.get(
            f"/api/profile/{account['id']}", params={"course_id": "course-os"}
        )
        assert own.status_code == 200
        other = client.get(
            "/api/profile/someone-else", params={"course_id": "course-os"}
        )
        assert other.status_code == 403


def test_voice_readiness_is_public_but_synthesis_requires_login(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        readiness = client.get("/api/voice/status")
        synthesis = client.post(
            "/api/voice/synthesize",
            json={"text": "你好，昔涟。"},
        )

    assert readiness.status_code == 200
    assert readiness.json()["voice"] == "cyrene"
    assert synthesis.status_code == 401
    assert synthesis.json() == {"detail": "authentication required"}
