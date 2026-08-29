from __future__ import annotations

import asyncio
import io
import threading
import time
import wave

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app
from app.voice.genie_embedded import EmbeddedGenieTTSProvider
from app.voice.genie_runtime import GenieRuntimeError


def _valid_wav(frames: int = 320) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(32_000)
        output.writeframes(b"\x01" * frames * 2)
    return buffer.getvalue()


def _configure_embedded_genie(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    package_dir = tmp_path / "runtime" / "genie-tts" / "src" / "genie_tts"
    package_dir.mkdir(parents=True)
    (package_dir / "__init__.py").write_text("", encoding="utf-8")
    monkeypatch.setenv("EDUCATION_TTS_PROVIDER", "genie")
    monkeypatch.setenv(
        "EDUCATION_TTS_GENIE_ROOT", str(tmp_path / "runtime" / "genie-tts")
    )
    monkeypatch.setenv("EDUCATION_TTS_MODEL_DIR", str(tmp_path / "model"))
    monkeypatch.setenv("EDUCATION_TTS_GENIE_DATA_DIR", str(tmp_path / "GenieData"))
    monkeypatch.setenv(
        "EDUCATION_TTS_REFERENCE_AUDIO_PATH", str(tmp_path / "reference.wav")
    )
    monkeypatch.setenv("EDUCATION_TTS_REFERENCE_TEXT", "参考文本")
    get_settings.cache_clear()


class _StubRuntime:
    def __init__(
        self,
        *,
        start_error: Exception | None = None,
        synthesis_error: Exception | None = None,
        delay: float = 0,
    ) -> None:
        self.start_error = start_error
        self.synthesis_error = synthesis_error
        self.delay = delay
        self.start_calls = 0
        self.active = 0
        self.max_active = 0
        self._guard = threading.Lock()

    def start(self) -> None:
        self.start_calls += 1
        if self.start_error:
            raise self.start_error

    def synthesize_to_wav(self, text: str) -> bytes:
        with self._guard:
            self.active += 1
            self.max_active = max(self.max_active, self.active)
        try:
            if self.delay:
                time.sleep(self.delay)
            if self.synthesis_error:
                raise self.synthesis_error
            return _valid_wav(max(len(text), 1))
        finally:
            with self._guard:
                self.active -= 1


def test_application_loads_embedded_genie_once_and_serves_voice(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    _configure_embedded_genie(monkeypatch, tmp_path)
    runtime = _StubRuntime()
    application = create_app(voice_runtime_factory=lambda _: runtime)

    with TestClient(application) as client:
        status = client.get("/api/voice/status")
        synthesis = client.post(
            "/api/voice/synthesize",
            json={"text": "你好，昔涟。"},
        )

    assert runtime.start_calls == 1
    assert status.status_code == 200
    assert status.json()["provider"] == "genie_tts"
    assert status.json()["configured"] is True
    assert synthesis.status_code == 200
    assert synthesis.headers["x-voice-provider"] == "genie-tts"
    assert synthesis.content.startswith(b"RIFF")


def test_failed_embedded_runtime_keeps_api_available_and_status_honest(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    _configure_embedded_genie(monkeypatch, tmp_path)
    runtime = _StubRuntime(start_error=RuntimeError(f"secret path: {tmp_path}"))
    application = create_app(voice_runtime_factory=lambda _: runtime)

    with TestClient(application) as client:
        status = client.get("/api/voice/status")
        synthesis = client.post("/api/voice/synthesize", json={"text": "测试"})

    assert runtime.start_calls == 1
    assert status.status_code == 200
    assert status.json()["provider"] == "unavailable"
    assert status.json()["configured"] is False
    assert str(tmp_path) not in status.text
    assert synthesis.status_code == 503
    assert synthesis.json() == {"detail": "昔涟语音服务未配置"}
    assert str(tmp_path) not in synthesis.text


@pytest.mark.anyio
async def test_embedded_provider_serializes_overlapping_inference() -> None:
    runtime = _StubRuntime(delay=0.03)
    provider = EmbeddedGenieTTSProvider(runtime)

    results = await asyncio.gather(
        provider.synthesize("第一条"),
        provider.synthesize("第二条"),
        provider.synthesize("第三条"),
    )

    assert all(result.content.startswith(b"RIFF") for result in results)
    assert runtime.max_active == 1


@pytest.mark.anyio
async def test_embedded_provider_sanitizes_runtime_failure() -> None:
    runtime = _StubRuntime(
        synthesis_error=GenieRuntimeError("F:/private/model failed")
    )
    provider = EmbeddedGenieTTSProvider(runtime)

    with pytest.raises(Exception, match="昔涟语音生成失败") as caught:
        await provider.synthesize("测试")

    assert "private" not in str(caught.value)
