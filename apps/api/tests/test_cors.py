from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


def _preflight(client: TestClient, origin: str):
    return client.options(
        "/api/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )


def test_configured_origin_receives_cors_header(monkeypatch) -> None:
    monkeypatch.setenv(
        "EDUCATION_CORS_ORIGINS",
        "https://host.example, https://second.example",
    )
    get_settings.cache_clear()
    client = TestClient(create_app())

    response = _preflight(client, "https://host.example")

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://host.example"


def test_unlisted_origin_is_not_allowed(monkeypatch) -> None:
    monkeypatch.setenv("EDUCATION_CORS_ORIGINS", "https://host.example")
    get_settings.cache_clear()
    client = TestClient(create_app())

    response = _preflight(client, "https://untrusted.example")

    assert "access-control-allow-origin" not in response.headers


def test_cors_parser_removes_duplicates_and_rejects_unsafe_origins(
    monkeypatch,
) -> None:
    monkeypatch.setenv(
        "EDUCATION_CORS_ORIGINS",
        "https://host.example, https://host.example, *, javascript:alert(1)",
    )
    get_settings.cache_clear()

    assert get_settings().allowed_cors_origins() == ["https://host.example"]
