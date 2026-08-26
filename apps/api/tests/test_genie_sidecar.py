from __future__ import annotations

import concurrent.futures
import io
import os
import threading
import time
import wave
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.voice.genie_sidecar import (
    GenieRuntime,
    GenieRuntimeError,
    GenieSidecarConfigurationError,
    GenieSidecarSettings,
    create_genie_sidecar,
)


def _valid_wav(
    *,
    frames: int = 320,
    channels: int = 1,
    sample_width: int = 2,
    sample_rate: int = 32_000,
) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as output:
        output.setnchannels(channels)
        output.setsampwidth(sample_width)
        output.setframerate(sample_rate)
        output.writeframes(b"\x01" * frames * channels * sample_width)
    return buffer.getvalue()


def _settings(tmp_path: Path, **overrides: object) -> GenieSidecarSettings:
    values: dict[str, object] = {
        "host": "127.0.0.1",
        "port": 9881,
        "model_dir": tmp_path / "model",
        "reference_audio": tmp_path / "reference.wav",
        "reference_text": "能在梦里听见朦胧的神谕。",
        "genie_data_dir": tmp_path / "GenieData",
        "max_audio_bytes": 1_000_000,
    }
    values.update(overrides)
    return GenieSidecarSettings(**values)


@pytest.mark.parametrize("host", ["0.0.0.0", "192.168.1.8", "example.com", ""])
def test_settings_reject_non_loopback_hosts(tmp_path: Path, host: str) -> None:
    with pytest.raises(GenieSidecarConfigurationError, match="仅允许回环地址"):
        _settings(tmp_path, host=host).validated()


@pytest.mark.parametrize("port", [0, 65536])
def test_settings_reject_invalid_port(tmp_path: Path, port: int) -> None:
    with pytest.raises(GenieSidecarConfigurationError, match="端口无效"):
        _settings(tmp_path, port=port).validated()


@pytest.mark.parametrize("field", ["model_dir", "reference_audio", "genie_data_dir"])
def test_settings_require_absolute_paths(tmp_path: Path, field: str) -> None:
    with pytest.raises(GenieSidecarConfigurationError, match="必须使用绝对路径") as caught:
        _settings(tmp_path, **{field: Path("relative")}).validated()

    assert str(tmp_path) not in str(caught.value)


def test_settings_reject_blank_reference_text(tmp_path: Path) -> None:
    with pytest.raises(GenieSidecarConfigurationError, match="参考文本不能为空"):
        _settings(tmp_path, reference_text=" \n ").validated()


def test_settings_load_from_environment_without_importing_genie(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GENIE_DATA_DIR", str(tmp_path / "GenieData"))
    monkeypatch.setenv("GENIE_SIDECAR_MODEL_DIR", str(tmp_path / "model"))
    monkeypatch.setenv("GENIE_SIDECAR_REFERENCE_AUDIO", str(tmp_path / "reference.wav"))
    monkeypatch.setenv("GENIE_SIDECAR_REFERENCE_TEXT", "参考文本")
    monkeypatch.setenv("GENIE_SIDECAR_PORT", "9981")

    settings = GenieSidecarSettings.from_environment()

    assert settings.host == "127.0.0.1"
    assert settings.port == 9981
    assert settings.reference_text == "参考文本"


class _FakeGenieModule:
    def __init__(self, output: bytes, *, fail: bool = False) -> None:
        self.output = output
        self.fail = fail
        self.calls: list[tuple[str, dict[str, object]]] = []
        self.last_save_path: Path | None = None

    def load_character(self, **kwargs: object) -> None:
        self.calls.append(("load_character", kwargs))

    def set_reference_audio(self, **kwargs: object) -> None:
        self.calls.append(("set_reference_audio", kwargs))

    def tts(self, **kwargs: object) -> None:
        self.calls.append(("tts", kwargs))
        self.last_save_path = Path(str(kwargs["save_path"]))
        if self.fail:
            raise RuntimeError(f"private path leaked: {self.last_save_path}")
        self.last_save_path.write_bytes(self.output)


def test_runtime_validates_before_import_and_loads_only_fixed_character(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = _settings(tmp_path)
    fake = _FakeGenieModule(_valid_wav())
    order: list[str] = []

    def validate(*_: object) -> object:
        order.append("validate")
        return object()

    def importer() -> _FakeGenieModule:
        order.append("import")
        assert os.environ["GENIE_DATA_DIR"] == str(settings.genie_data_dir)
        return fake

    monkeypatch.delenv("GENIE_DATA_DIR", raising=False)
    runtime = GenieRuntime(settings, importer=importer, asset_validator=validate)
    runtime.start()

    assert order == ["validate", "import"]
    assert fake.calls == [
        (
            "load_character",
            {
                "character_name": "cyrene",
                "onnx_model_dir": str(settings.model_dir),
                "language": "zh",
            },
        ),
        (
            "set_reference_audio",
            {
                "character_name": "cyrene",
                "audio_path": str(settings.reference_audio),
                "audio_text": settings.reference_text,
                "language": "zh",
            },
        ),
    ]


@pytest.mark.parametrize(
    ("output", "message"),
    [
        (b"", "未生成音频"),
        (b"not-wave", "不是有效 WAV"),
        (_valid_wav(frames=0), "没有音频帧"),
        (_valid_wav(channels=2), "必须为单声道"),
        (_valid_wav(sample_width=1), "必须为 16 位"),
        (_valid_wav(sample_rate=44_100), "采样率必须为 32 kHz"),
    ],
)
def test_runtime_rejects_invalid_output_and_deletes_temporary_file(
    tmp_path: Path,
    output: bytes,
    message: str,
) -> None:
    fake = _FakeGenieModule(output)
    runtime = GenieRuntime(
        _settings(tmp_path),
        importer=lambda: fake,
        asset_validator=lambda *_: object(),
        temporary_directory=tmp_path,
    )
    runtime.start()

    with pytest.raises(GenieRuntimeError, match=message):
        runtime.synthesize_to_wav("测试")

    assert fake.last_save_path is not None
    assert not fake.last_save_path.exists()


def test_runtime_rejects_audio_over_the_configured_size_limit(tmp_path: Path) -> None:
    fake = _FakeGenieModule(_valid_wav(frames=400))
    runtime = GenieRuntime(
        _settings(tmp_path, max_audio_bytes=100),
        importer=lambda: fake,
        asset_validator=lambda *_: object(),
        temporary_directory=tmp_path,
    )
    runtime.start()

    with pytest.raises(GenieRuntimeError, match="超过大小限制"):
        runtime.synthesize_to_wav("测试")

    assert fake.last_save_path is not None
    assert not fake.last_save_path.exists()


def test_runtime_maps_internal_failure_and_deletes_temporary_file(tmp_path: Path) -> None:
    fake = _FakeGenieModule(_valid_wav(), fail=True)
    runtime = GenieRuntime(
        _settings(tmp_path),
        importer=lambda: fake,
        asset_validator=lambda *_: object(),
        temporary_directory=tmp_path,
    )
    runtime.start()

    with pytest.raises(GenieRuntimeError, match="语音生成失败") as caught:
        runtime.synthesize_to_wav("测试")

    assert str(tmp_path) not in str(caught.value)
    assert fake.last_save_path is not None
    assert not fake.last_save_path.exists()


def test_runtime_returns_true_wav_and_never_plays_audio(tmp_path: Path) -> None:
    expected = _valid_wav()
    fake = _FakeGenieModule(expected)
    runtime = GenieRuntime(
        _settings(tmp_path),
        importer=lambda: fake,
        asset_validator=lambda *_: object(),
        temporary_directory=tmp_path,
    )
    runtime.start()

    result = runtime.synthesize_to_wav("解释死锁。")

    assert result == expected
    _, tts_call = fake.calls[-1]
    assert tts_call["character_name"] == "cyrene"
    assert tts_call["text"] == "解释死锁。"
    assert tts_call["play"] is False
    assert tts_call["split_sentence"] is True
    assert fake.last_save_path is not None
    assert not fake.last_save_path.exists()


class _StubRuntime:
    def __init__(self, *, start_error: Exception | None = None, delay: float = 0) -> None:
        self.start_error = start_error
        self.delay = delay
        self.started = False
        self.active = 0
        self.max_active = 0
        self.lock = threading.Lock()

    def start(self) -> None:
        if self.start_error:
            raise self.start_error
        self.started = True

    def synthesize_to_wav(self, text: str) -> bytes:
        assert self.started
        with self.lock:
            self.active += 1
            self.max_active = max(self.max_active, self.active)
        try:
            if self.delay:
                time.sleep(self.delay)
            return _valid_wav(frames=max(len(text), 1))
        finally:
            with self.lock:
                self.active -= 1


def test_sidecar_exposes_only_health_and_text_tts(tmp_path: Path) -> None:
    runtime = _StubRuntime()
    app = create_genie_sidecar(_settings(tmp_path), runtime_factory=lambda _: runtime)
    business_paths = {
        route.path
        for route in app.routes
        if route.path not in {"/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"}
    }

    with TestClient(app) as client:
        health = client.get("/health")
        response = client.post("/tts", json={"text": "你好，昔涟。"})
        forbidden = client.post(
            "/tts",
            json={"text": "测试", "save_path": "C:/private/output.wav"},
        )

    assert business_paths == {"/health", "/tts"}
    assert health.json() == {
        "ready": True,
        "runtime": "genie_tts",
        "voice": "cyrene",
    }
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/wav")
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-voice-provider"] == "genie-tts"
    assert response.content.startswith(b"RIFF")
    assert forbidden.status_code == 422


def test_sidecar_stays_diagnostic_when_runtime_cannot_start(tmp_path: Path) -> None:
    runtime = _StubRuntime(start_error=RuntimeError(f"secret: {tmp_path}"))
    app = create_genie_sidecar(_settings(tmp_path), runtime_factory=lambda _: runtime)

    with TestClient(app) as client:
        health = client.get("/health")
        synthesis = client.post("/tts", json={"text": "测试"})

    assert health.status_code == 503
    assert health.json() == {"detail": "昔涟 Genie-TTS 运行时未就绪"}
    assert synthesis.status_code == 503
    assert str(tmp_path) not in health.text
    assert str(tmp_path) not in synthesis.text


def test_sidecar_serializes_overlapping_synthesis_requests(tmp_path: Path) -> None:
    runtime = _StubRuntime(delay=0.05)
    app = create_genie_sidecar(_settings(tmp_path), runtime_factory=lambda _: runtime)

    with TestClient(app) as client:
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            responses = list(
                pool.map(
                    lambda value: client.post("/tts", json={"text": value}),
                    ["第一条", "第二条", "第三条"],
                )
            )

    assert all(response.status_code == 200 for response in responses)
    assert runtime.max_active == 1


def test_sidecar_maps_runtime_error_without_leaking_details(tmp_path: Path) -> None:
    class FailingRuntime(_StubRuntime):
        def synthesize_to_wav(self, text: str) -> bytes:
            raise GenieRuntimeError(f"secret path: {tmp_path}; text={text}")

    app = create_genie_sidecar(
        _settings(tmp_path),
        runtime_factory=lambda _: FailingRuntime(),
    )

    with TestClient(app) as client:
        response = client.post("/tts", json={"text": "测试"})

    assert response.status_code == 502
    assert response.json() == {"detail": "昔涟 Genie-TTS 语音生成失败"}
    assert str(tmp_path) not in response.text


def test_sidecar_validates_text_boundaries(tmp_path: Path) -> None:
    app = create_genie_sidecar(
        _settings(tmp_path),
        runtime_factory=lambda _: _StubRuntime(),
    )

    with TestClient(app) as client:
        empty = client.post("/tts", json={"text": ""})
        whitespace = client.post("/tts", json={"text": "  \n"})
        too_long = client.post("/tts", json={"text": "昔" * 601})

    assert empty.status_code == 422
    assert whitespace.status_code == 422
    assert too_long.status_code == 422
