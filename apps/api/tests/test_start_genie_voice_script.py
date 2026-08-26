from __future__ import annotations

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
SCRIPT = PROJECT_ROOT / "apps" / "api" / "scripts" / "start_genie_voice.ps1"


def test_launcher_is_loopback_single_worker_and_path_configurable() -> None:
    content = SCRIPT.read_text(encoding="utf-8")

    for parameter in (
        "$GenieRoot",
        "$ModelDirectory",
        "$ReferenceAudio",
        "$HostAddress",
        "$Port",
        "$ValidateOnly",
        "$PrintEducationEnvironment",
    ):
        assert parameter in content

    assert "127.0.0.1" in content
    assert "localhost" in content
    assert "::1" in content
    assert "--workers" in content
    assert "'1'" in content or '"1"' in content
    assert "EDUCATION_TTS_PROVIDER" in content
    assert "EDUCATION_TTS_BASE_URL" in content
    assert "GENIE_SIDECAR_MODEL_DIR" in content
    assert "GENIE_SIDECAR_REFERENCE_AUDIO" in content
    assert "GENIE_SIDECAR_REFERENCE_TEXT" in content
    assert "GENIE_DATA_DIR" in content


def test_launcher_does_not_request_admin_or_build_shell_command_strings() -> None:
    content = SCRIPT.read_text(encoding="utf-8")
    lowered = content.lower()

    assert "runas" not in lowered
    assert "verb" not in lowered
    assert "start-process" not in lowered
    assert "invoke-expression" not in lowered
    assert "iex" not in lowered
    assert "0.0.0.0" not in content
    assert "--factory" in content
    assert "app.voice.genie_sidecar:create_app" in content
