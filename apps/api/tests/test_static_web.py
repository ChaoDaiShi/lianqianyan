from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


def test_optional_web_dist_is_served_without_shadowing_api(
    monkeypatch, tmp_path: Path
) -> None:
    web = tmp_path / "web"
    assets = web / "assets"
    assets.mkdir(parents=True)
    (web / "index.html").write_text("<div id='root'>EducationMind</div>", encoding="utf-8")
    (assets / "app.js").write_text("window.ready=true", encoding="utf-8")
    monkeypatch.setenv("EDUCATION_WEB_DIST_DIR", str(web.resolve()))

    with TestClient(create_app()) as client:
        assert client.get("/").text == "<div id='root'>EducationMind</div>"
        assert client.get("/assets/app.js").text == "window.ready=true"
        assert client.get("/api/health").status_code == 200


def test_missing_web_dist_keeps_api_only_mode(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("EDUCATION_WEB_DIST_DIR", str(tmp_path / "missing"))

    with TestClient(create_app()) as client:
        assert client.get("/").status_code == 404
        assert client.get("/api/health").status_code == 200
