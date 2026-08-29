from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.db.session import SessionLocal, engine
from app.domain import Base, Course
from app.main import create_app


def _request(method: str, request_id: int, params: dict) -> dict:
    return {"jsonrpc": "2.0", "id": request_id, "method": method, "params": params}


def test_remote_mcp_requires_account_token_and_scopes_tools(monkeypatch) -> None:
    monkeypatch.setenv("EDUCATION_AUTH_REQUIRED", "true")
    get_settings.cache_clear()
    application = create_app()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        db.add(Course(id="course-os", name="操作系统"))
        db.commit()

    with TestClient(application) as client:
        denied = client.post(
            "/mcp/",
            headers={"Accept": "application/json, text/event-stream"},
            json=_request("tools/list", 1, {}),
        )
        assert denied.status_code == 401

        registered = client.post("/api/auth/register", json={
            "username": f"mcp-{uuid.uuid4().hex[:8]}",
            "display_name": "MCP 学生",
            "password": "Study2026",
        }).json()["account"]
        assert client.put("/api/auth/course", json={"course_id": "course-os"}).status_code == 200
        raw = client.post("/api/settings/mcp-tokens", json={"name": "测试智能体"}).json()["token"]
        headers = {
            "Authorization": f"Bearer {raw}",
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json",
            "MCP-Protocol-Version": "2025-06-18",
        }
        listed = client.post("/mcp/", headers=headers, json=_request("tools/list", 2, {}))
        called = client.post(
            "/mcp/",
            headers=headers,
            json=_request("tools/call", 3, {"name": "get_learner_profile", "arguments": {}}),
        )

    assert listed.status_code == 200
    tools = listed.json()["result"]["tools"]
    profile_tool = next(item for item in tools if item["name"] == "get_learner_profile")
    assert profile_tool["inputSchema"]["properties"] == {}
    assert called.status_code == 200
    assert registered["id"] in called.text
    assert "course-os" in called.text
