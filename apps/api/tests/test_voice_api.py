from __future__ import annotations

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.routes.voice import get_voice_provider
from app.core.config import Settings, get_settings
from app.main import create_app
from app.voice.gpt_sovits import (
    GPTSoVITSProvider,
    VoiceProviderError,
)
from app.voice.models import VOICE_ATTRIBUTION


def _configured_settings(**overrides) -> Settings:
    values = {
        "tts_base_url": "http://127.0.0.1:9880",
        "tts_reference_audio_path": "C:/voice/cyrene-reference.wav",
        "tts_reference_text": (
            "能在梦里听见朦胧的神谕，还在它的指引下前行…"
            "人家也觉得很神奇呢。"
        ),
        "tts_timeout": 4.0,
        "tts_max_audio_bytes": 1024,
    }
    values.update(overrides)
    return Settings(**values)


def test_voice_status_is_honest_and_contains_exact_attribution(
    monkeypatch,
) -> None:
    for key in (
        "EDUCATION_TTS_BASE_URL",
        "EDUCATION_TTS_REFERENCE_AUDIO_PATH",
        "EDUCATION_TTS_REFERENCE_TEXT",
    ):
        monkeypatch.delenv(key, raising=False)
    get_settings.cache_clear()

    with TestClient(create_app()) as client:
        response = client.get("/api/voice/status")

    assert response.status_code == 200
    assert response.json() == {
        "provider": "unavailable",
        "voice": "cyrene",
        "configured": False,
        "fallback": "browser_speech",
        "attribution": VOICE_ATTRIBUTION,
    }
    assert "reference_audio" not in response.text
    assert "9880" not in response.text


def test_voice_status_requires_complete_configuration(monkeypatch) -> None:
    monkeypatch.setenv("EDUCATION_TTS_BASE_URL", "http://127.0.0.1:9880")
    monkeypatch.delenv("EDUCATION_TTS_REFERENCE_AUDIO_PATH", raising=False)
    monkeypatch.delenv("EDUCATION_TTS_REFERENCE_TEXT", raising=False)
    get_settings.cache_clear()

    with TestClient(create_app()) as client:
        response = client.get("/api/voice/status")

    assert response.status_code == 200
    assert response.json()["configured"] is False
    assert response.json()["provider"] == "unavailable"


def test_unconfigured_synthesis_returns_503_without_network(monkeypatch) -> None:
    for key in (
        "EDUCATION_TTS_BASE_URL",
        "EDUCATION_TTS_REFERENCE_AUDIO_PATH",
        "EDUCATION_TTS_REFERENCE_TEXT",
    ):
        monkeypatch.delenv(key, raising=False)
    get_settings.cache_clear()

    with TestClient(create_app()) as client:
        response = client.post(
            "/api/voice/synthesize",
            json={"text": "请解释死锁。"},
        )

    assert response.status_code == 503
    assert response.json() == {"detail": "昔涟语音服务未配置"}


@pytest.mark.anyio
async def test_provider_posts_fixed_official_v2_payload_and_returns_wav() -> None:
    received: dict[str, object] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        received.update(json.loads(request.content))
        assert request.url == "http://127.0.0.1:9880/tts"
        return httpx.Response(
            200,
            headers={"content-type": "audio/wav"},
            content=b"RIFF-cyrene-wave",
        )

    provider = GPTSoVITSProvider(
        _configured_settings(),
        transport=httpx.MockTransport(handler),
    )

    result = await provider.synthesize("死锁的四个必要条件")

    assert received == {
        "text": "死锁的四个必要条件",
        "text_lang": "zh",
        "ref_audio_path": "C:/voice/cyrene-reference.wav",
        "prompt_text": (
            "能在梦里听见朦胧的神谕，还在它的指引下前行…"
            "人家也觉得很神奇呢。"
        ),
        "prompt_lang": "zh",
        "text_split_method": "cut5",
        "batch_size": 1,
        "media_type": "wav",
        "streaming_mode": False,
        "speed_factor": 1.0,
    }
    assert result.content == b"RIFF-cyrene-wave"
    assert result.media_type == "audio/wav"


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("response", "message"),
    [
        (
            httpx.Response(
                200,
                headers={"content-type": "application/json"},
                json={"message": "not audio"},
            ),
            "上游未返回 WAV 音频",
        ),
        (
            httpx.Response(400, json={"Exception": "C:/secret/ref.wav failed"}),
            "昔涟语音生成失败",
        ),
    ],
)
async def test_provider_rejects_unsafe_upstream_responses(
    response: httpx.Response,
    message: str,
) -> None:
    provider = GPTSoVITSProvider(
        _configured_settings(),
        transport=httpx.MockTransport(lambda _: response),
    )

    with pytest.raises(VoiceProviderError, match=message) as caught:
        await provider.synthesize("测试")

    assert "C:/secret" not in str(caught.value)


@pytest.mark.anyio
async def test_provider_stops_when_audio_exceeds_limit() -> None:
    provider = GPTSoVITSProvider(
        _configured_settings(tts_max_audio_bytes=4),
        transport=httpx.MockTransport(
            lambda _: httpx.Response(
                200,
                headers={"content-type": "audio/x-wav"},
                content=b"12345",
            )
        ),
    )

    with pytest.raises(VoiceProviderError, match="音频超过大小限制"):
        await provider.synthesize("测试")


@pytest.mark.anyio
async def test_provider_maps_timeout_without_leaking_configuration() -> None:
    async def timeout(_: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("C:/voice/cyrene-reference.wav timed out")

    provider = GPTSoVITSProvider(
        _configured_settings(),
        transport=httpx.MockTransport(timeout),
    )

    with pytest.raises(VoiceProviderError, match="语音服务响应超时") as caught:
        await provider.synthesize("测试")

    assert "C:/voice" not in str(caught.value)


def test_route_relays_wav_without_cache() -> None:
    class StubProvider:
        async def synthesize(self, text: str):
            assert text == "你好，昔涟。"
            from app.voice.models import SynthesizedVoiceAudio

            return SynthesizedVoiceAudio(
                content=b"RIFF-route-wave",
                media_type="audio/wav",
            )

    application = create_app()
    application.dependency_overrides[get_voice_provider] = StubProvider
    try:
        with TestClient(application) as client:
            response = client.post(
                "/api/voice/synthesize",
                json={"text": "你好，昔涟。"},
            )
    finally:
        application.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.content == b"RIFF-route-wave"
    assert response.headers["content-type"].startswith("audio/wav")
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-voice-provider"] == "gpt-sovits"


def test_route_validates_synthesis_text() -> None:
    with TestClient(create_app()) as client:
        empty = client.post("/api/voice/synthesize", json={"text": ""})
        too_long = client.post(
            "/api/voice/synthesize",
            json={"text": "昔" * 601},
        )

    assert empty.status_code == 422
    assert too_long.status_code == 422
