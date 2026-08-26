from __future__ import annotations

import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
PACKAGE_JSON = PROJECT_ROOT / "package.json"
SCRIPT = PROJECT_ROOT / "scripts" / "start-cyrene-web.ps1"


def test_package_exposes_the_cyrene_web_runtime() -> None:
    package = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))

    command = package["scripts"]["dev:cyrene"]

    assert command.startswith("pwsh ")
    assert "-NoProfile" in command
    assert "-ExecutionPolicy Bypass" in command
    assert "scripts/start-cyrene-web.ps1" in command


def test_runtime_validates_starts_waits_and_cleans_its_owned_processes() -> None:
    content = SCRIPT.read_text(encoding="utf-8")

    for parameter in (
        "$GenieRoot",
        "$ModelDirectory",
        "$ReferenceAudio",
        "$SidecarPort",
        "$ApiPort",
        "$WebPort",
        "$DatabasePath",
        "$StartupTimeoutSeconds",
        "$ValidateOnly",
    ):
        assert parameter in content

    for required_value in (
        "127.0.0.1",
        "EDUCATION_TTS_PROVIDER",
        "EDUCATION_TTS_BASE_URL",
        "EDUCATION_DATABASE_URL",
        ".local\\runtime",
        "Get-NetTCPConnection",
        "Invoke-WebRequest",
        "/health",
        "/api/voice/status",
        "Start-Process",
        "-WindowStyle Hidden",
        "JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE",
        "AssignProcessToJobObject",
        "CreateKillOnCloseJob",
        "Stop-ProcessTree",
        "$sidecarProcess.Id",
        "$apiProcess.Id",
        "$webProcess.Id",
    ):
        assert required_value in content

    assert "while (" in content
    assert "pnpm.cmd" in content
    assert "0.0.0.0" not in content
    assert "Invoke-Expression" not in content
    assert "taskkill" not in content.lower()


def test_runtime_does_not_stop_an_unknown_port_owner() -> None:
    content = SCRIPT.read_text(encoding="utf-8")

    assert "Assert-PortAvailable" in content
    assert "端口已被其他进程占用" in content
    assert "Stop-ProcessTree -ProcessId $sidecarProcess.Id" in content
    assert "Stop-ProcessTree -ProcessId $apiProcess.Id" in content
    assert "Stop-ProcessTree -ProcessId $webProcess.Id" in content
    assert "Stop-Process -Id $connection.OwningProcess" not in content
