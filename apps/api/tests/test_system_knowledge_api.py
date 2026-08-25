from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


def test_llm_status_is_safe_when_configuration_is_incomplete(monkeypatch) -> None:
    for key in (
        "EDUCATION_LLM_BASE_URL",
        "EDUCATION_LLM_API_KEY",
        "EDUCATION_LLM_MODEL",
    ):
        monkeypatch.delenv(key, raising=False)
    get_settings.cache_clear()

    response = TestClient(create_app()).get("/api/system/llm")

    assert response.status_code == 200
    assert response.json() == {
        "provider": "unavailable",
        "model": None,
        "configured": False,
    }


def test_llm_status_exposes_only_safe_model_metadata(monkeypatch) -> None:
    monkeypatch.setenv("EDUCATION_LLM_BASE_URL", "https://llm.test/v1?token=hidden")
    monkeypatch.setenv("EDUCATION_LLM_API_KEY", "secret-key")
    monkeypatch.setenv("EDUCATION_LLM_MODEL", "grounded-model")
    get_settings.cache_clear()

    response = TestClient(create_app()).get("/api/system/llm")

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "provider": "openai_compatible",
        "model": "grounded-model",
        "configured": True,
    }
    serialized = response.text.lower()
    assert "secret-key" not in serialized
    assert "llm.test" not in serialized
    assert "authorization" not in serialized


def test_knowledge_search_and_point_content_endpoints() -> None:
    client = TestClient(create_app())

    search = client.post(
        "/api/knowledge/search",
        json={
            "course_id": "course-os",
            "query": "四个条件怎么记？",
            "knowledge_point_id": "kp-deadlock",
        },
    )
    assert search.status_code == 200
    results = search.json()["results"]
    assert results
    assert results[0]["knowledge_point_id"] == "kp-deadlock"
    assert all(item["content"] for item in results)

    point = client.get(
        "/api/knowledge/points/kp-deadlock",
        params={"course_id": "course-os"},
    )
    assert point.status_code == 200
    assert point.json()["title"] == "死锁"
    assert any(
        section["title"] == "四个必要条件"
        for section in point.json()["sections"]
    )


def test_knowledge_endpoints_enforce_course_isolation_and_bounds() -> None:
    client = TestClient(create_app())

    isolated = client.post(
        "/api/knowledge/search",
        json={"course_id": "other-course", "query": "死锁"},
    )
    assert isolated.status_code == 200
    assert isolated.json() == {"results": []}

    missing = client.get(
        "/api/knowledge/points/kp-deadlock",
        params={"course_id": "other-course"},
    )
    assert missing.status_code == 404

    invalid = client.post(
        "/api/knowledge/search",
        json={"course_id": "course-os", "query": "死锁", "top_k": 9},
    )
    assert invalid.status_code == 422
