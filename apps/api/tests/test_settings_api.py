from __future__ import annotations

from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.auth.models import AuthAccount
from app.core.config import get_settings
from app.db.session import SessionLocal, engine
from app.domain import Base, Course
from app.main import create_app
from app.preferences.models import ModelProfile


def _client(monkeypatch) -> TestClient:
    monkeypatch.setenv("EDUCATION_AUTH_REQUIRED", "true")
    monkeypatch.setenv("EDUCATION_CUSTOM_MODEL_HOSTS", "models.example.com,voice.example.com")
    monkeypatch.setenv("EDUCATION_MODEL_SECRET_KEY", Fernet.generate_key().decode("ascii"))
    get_settings.cache_clear()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        db.add(Course(id="course-os", name="操作系统"))
        db.commit()
    client = TestClient(create_app())
    client.post("/api/auth/register", json={"username": "student", "display_name": "学生", "password": "Study2026"})
    return client


def test_settings_store_secret_encrypted_and_never_return_it(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        created = client.post("/api/settings/models", json={
            "name": "课堂模型", "kind": "llm", "provider": "openai_chat",
            "base_url": "https://models.example.com/v1", "model": "teacher-v1",
            "api_key": "top-secret-value",
        })
        assert created.status_code == 201
        assert created.json()["has_api_key"] is True
        assert "top-secret-value" not in created.text
        settings = client.put("/api/settings/models/llm/selection", json={"profile_id": created.json()["id"]})
        assert settings.status_code == 200
        assert settings.json()["selected_llm_profile_id"] == created.json()["id"]

    with SessionLocal() as db:
        stored = db.scalar(select(ModelProfile))
        assert stored is not None
        assert stored.api_key_encrypted != "top-secret-value"
        assert "top-secret-value" not in (stored.api_key_encrypted or "")


def test_settings_reject_non_allowlisted_model_host(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        response = client.post("/api/settings/models", json={
            "name": "内网探测", "kind": "llm", "provider": "openai_chat",
            "base_url": "https://127.0.0.1:9000/v1", "model": "unsafe",
        })
    assert response.status_code == 422
    assert "not allowed" in response.json()["detail"]


def test_mcp_tokens_are_shown_once_and_revocable(monkeypatch) -> None:
    with _client(monkeypatch) as client:
        account = client.get("/api/auth/session").json()["account"]
        client.put("/api/auth/course", json={"course_id": "course-os"})
        created = client.post("/api/settings/mcp-tokens", json={"name": "桌面智能体"})
        assert created.status_code == 201
        raw = created.json()["token"]
        assert raw.startswith("emcp_")
        listed = client.get("/api/settings/mcp-tokens")
        assert listed.status_code == 200
        assert raw not in listed.text
        assert account["id"] not in listed.text
        revoked = client.delete(f"/api/settings/mcp-tokens/{created.json()['id']}")
        assert revoked.status_code == 204
        assert client.get("/api/settings/mcp-tokens").json() == []
