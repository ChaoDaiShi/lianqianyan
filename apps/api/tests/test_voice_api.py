from __future__ import annotations

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.routes.voice import get_voice_provider
from app.core.config import Settings, get_settings
from app.main import create_app
from app.voice.gpt_sovits import GPTSoVITSProvider, VoiceProviderError
from app.voice.models import VOICE_ATTRIBUTION, SynthesizedVoiceAudio
from app.voice.provider import UnavailableGenieTTSProvider, create_voice_provider


def _wav_signature(payload: bytes = b"cyrene-wave") -> bytes:
    return b"RIFF" + len(payload).to_bytes(4, "little") + b"WAVE" + payload


def _gpt_settings(**overrides) -> Settings:
    values = {
        "tts_provider": "gpt_sovits",
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


def test_voice_status_is_honest_and_contains_exact_attribution(monkeypatch) -> None:
    for key in (
        "EDUCATION_TTS_PROVIDER",
        "EDUCATION_TTS_BASE_URL",
        "EDUCATION_TTS_GENIE_ROOT",
        "EDUCATION_TTS_MODEL_DIR",
        "EDUCATION_TTS_GENIE_DATA_DIR",
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


@pytest.mark.parametrize("provider", ["unknown", "", "GENIE "])
def test_voice_status_rejects_unknown_or_noncanonical_provider(
    monkeypatch, provider: str
) -> None:
    monkeypatch.setenv("EDUCATION_TTS_PROVIDER", provider)
    get_settings.cache_clear()
    with TestClient(create_app()) as client:
        response = client.get("/api/voice/status")
    assert response.json()["configured"] is False
    assert response.json()["provider"] == "unavailable"


def test_unconfigured_synthesis_returns_503_without_network(monkeypatch) -> None:
    for key in (
        "EDUCATION_TTS_PROVIDER",
        "EDUCATION_TTS_GENIE_ROOT",
        "EDUCATION_TTS_MODEL_DIR",
        "EDUCATION_TTS_GENIE_DATA_DIR",
        "EDUCATION_TTS_REFERENCE_AUDIO_PATH",
        "EDUCATION_TTS_REFERENCE_TEXT",
    ):
        monkeypatch.delenv(key, raising=False)
    get_settings.cache_clear()
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/voice/synthesize", json={"text": "请解释死锁。"}
        )
    assert response.status_code == 503
    assert response.json() == {"detail": "昔涟语音服务未配置"}


@pytest.mark.anyio
async def test_gpt_provider_posts_fixed_payload_and_returns_wav() -> None:
    received: dict[str, object] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        received.update(json.loads(request.content))
        assert request.url == "http://127.0.0.1:9880/tts"
        return httpx.Response(
            200, headers={"content-type": "audio/wav"}, content=_wav_signature()
        )

    provider = GPTSoVITSProvider(
        _gpt_settings(), transport=httpx.MockTransport(handler)
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
    assert result.content == _wav_signature()


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("response", "message"),
    [
        (
            httpx.Response(200, headers={"content-type": "application/json"}),
            "上游未返回 WAV 音频",
        ),
        (
            httpx.Response(400, json={"Exception": "C:/secret/ref.wav failed"}),
            "昔涟语音生成失败",
        ),
    ],
)
async def test_gpt_provider_rejects_unsafe_upstream_responses(
    response: httpx.Response, message: str
) -> None:
    provider = GPTSoVITSProvider(
        _gpt_settings(), transport=httpx.MockTransport(lambda _: response)
    )
    with pytest.raises(VoiceProviderError, match=message) as caught:
        await provider.synthesize("测试")
    assert "C:/secret" not in str(caught.value)


@pytest.mark.anyio
async def test_gpt_provider_maps_timeout_and_size_limit() -> None:
    async def timeout(_: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("C:/voice/cyrene-reference.wav timed out")

    timeout_provider = GPTSoVITSProvider(
        _gpt_settings(), transport=httpx.MockTransport(timeout)
    )
    oversized_provider = GPTSoVITSProvider(
        _gpt_settings(tts_max_audio_bytes=4),
        transport=httpx.MockTransport(
            lambda _: httpx.Response(
                200, headers={"content-type": "audio/x-wav"}, content=b"12345"
            )
        ),
    )
    with pytest.raises(VoiceProviderError, match="响应超时") as caught:
        await timeout_provider.synthesize("测试")
    with pytest.raises(VoiceProviderError, match="超过大小限制"):
        await oversized_provider.synthesize("测试")
    assert "C:/voice" not in str(caught.value)


def test_provider_factory_keeps_gpt_compatibility_and_requires_embedded_runtime() -> None:
    assert isinstance(create_voice_provider(_gpt_settings()), GPTSoVITSProvider)
    assert isinstance(
        create_voice_provider(Settings(tts_provider="genie")),
        UnavailableGenieTTSProvider,
    )


def test_route_relays_wav_without_cache() -> None:
    class StubProvider:
        provider_name = "genie_tts"

        async def synthesize(self, text: str) -> SynthesizedVoiceAudio:
            assert text == "你好，昔涟。"
            return SynthesizedVoiceAudio(
                content=_wav_signature(b"route-wave"), media_type="audio/wav"
            )

    application = create_app()
    application.dependency_overrides[get_voice_provider] = StubProvider
    try:
        with TestClient(application) as client:
            response = client.post(
                "/api/voice/synthesize", json={"text": "你好，昔涟。"}
            )
    finally:
        application.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.content == _wav_signature(b"route-wave")
    assert response.headers["content-type"].startswith("audio/wav")
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-voice-provider"] == "genie-tts"


def test_route_validates_synthesis_text() -> None:
    with TestClient(create_app()) as client:
        empty = client.post("/api/voice/synthesize", json={"text": ""})
        too_long = client.post(
            "/api/voice/synthesize", json={"text": "昔" * 601}
        )
    assert empty.status_code == 422
    assert too_long.status_code == 422
