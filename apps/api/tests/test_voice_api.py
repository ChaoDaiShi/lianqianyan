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
from app.voice.genie import GenieTTSProvider
from app.voice.models import VOICE_ATTRIBUTION
from app.voice.provider import create_voice_provider


def _wav_signature(payload: bytes = b"cyrene-wave") -> bytes:
    return b"RIFF" + len(payload).to_bytes(4, "little") + b"WAVE" + payload


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


def _genie_settings(**overrides) -> Settings:
    values = {
        "tts_provider": "genie",
        "tts_base_url": "http://127.0.0.1:9881",
        "tts_timeout": 4.0,
        "tts_max_audio_bytes": 1024,
    }
    values.update(overrides)
    return Settings(**values)


def test_voice_status_is_honest_and_contains_exact_attribution(
    monkeypatch,
) -> None:
    for key in (
        "EDUCATION_TTS_PROVIDER",
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
    monkeypatch.delenv("EDUCATION_TTS_PROVIDER", raising=False)
    monkeypatch.setenv("EDUCATION_TTS_BASE_URL", "http://127.0.0.1:9880")
    monkeypatch.delenv("EDUCATION_TTS_REFERENCE_AUDIO_PATH", raising=False)
    monkeypatch.delenv("EDUCATION_TTS_REFERENCE_TEXT", raising=False)
    get_settings.cache_clear()

    with TestClient(create_app()) as client:
        response = client.get("/api/voice/status")

    assert response.status_code == 200
    assert response.json()["configured"] is False
    assert response.json()["provider"] == "unavailable"


def test_voice_status_reports_configured_genie_without_private_paths(
    monkeypatch,
) -> None:
    monkeypatch.setenv("EDUCATION_TTS_PROVIDER", "genie")
    monkeypatch.setenv("EDUCATION_TTS_BASE_URL", "http://127.0.0.1:9881")
    monkeypatch.delenv("EDUCATION_TTS_REFERENCE_AUDIO_PATH", raising=False)
    monkeypatch.delenv("EDUCATION_TTS_REFERENCE_TEXT", raising=False)
    get_settings.cache_clear()

    with TestClient(create_app()) as client:
        response = client.get("/api/voice/status")

    assert response.status_code == 200
    assert response.json() == {
        "provider": "genie_tts",
        "voice": "cyrene",
        "configured": True,
        "fallback": "browser_speech",
        "attribution": VOICE_ATTRIBUTION,
    }
    assert "9881" not in response.text
    assert "reference" not in response.text.lower()


@pytest.mark.parametrize("provider", ["unknown", "", "GENIE "])
def test_voice_status_rejects_unknown_or_noncanonical_provider(
    monkeypatch,
    provider: str,
) -> None:
    monkeypatch.setenv("EDUCATION_TTS_PROVIDER", provider)
    monkeypatch.setenv("EDUCATION_TTS_BASE_URL", "http://127.0.0.1:9881")
    get_settings.cache_clear()

    with TestClient(create_app()) as client:
        response = client.get("/api/voice/status")

    assert response.json()["configured"] is False
    assert response.json()["provider"] == "unavailable"


def test_unconfigured_synthesis_returns_503_without_network(monkeypatch) -> None:
    for key in (
        "EDUCATION_TTS_PROVIDER",
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
            content=_wav_signature(),
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
    assert result.content == _wav_signature()
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
async def test_gpt_provider_rejects_empty_or_false_wav() -> None:
    for content in (b"", b"RIFF-not-really-wave"):
        provider = GPTSoVITSProvider(
            _configured_settings(),
            transport=httpx.MockTransport(
                lambda _: httpx.Response(
                    200,
                    headers={"content-type": "audio/wav"},
                    content=content,
                )
            ),
        )

        with pytest.raises(VoiceProviderError, match="有效 WAV"):
            await provider.synthesize("测试")


@pytest.mark.anyio
async def test_genie_provider_posts_text_only_and_returns_true_wav() -> None:
    received: dict[str, object] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        received.update(json.loads(request.content))
        assert request.url == "http://127.0.0.1:9881/tts"
        return httpx.Response(
            200,
            headers={"content-type": "audio/wav"},
            content=_wav_signature(b"genie-cyrene"),
        )

    provider = GenieTTSProvider(
        _genie_settings(),
        transport=httpx.MockTransport(handler),
    )

    result = await provider.synthesize("请解释死锁。")

    assert received == {"text": "请解释死锁。"}
    assert result.content == _wav_signature(b"genie-cyrene")
    assert result.media_type == "audio/wav"
    assert provider.provider_name == "genie_tts"


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("response", "message"),
    [
        (httpx.Response(200, headers={"content-type": "audio/wav"}), "有效 WAV"),
        (
            httpx.Response(
                200,
                headers={"content-type": "audio/wav"},
                content=b"RIFF-private-path-but-no-wave",
            ),
            "有效 WAV",
        ),
        (
            httpx.Response(200, headers={"content-type": "application/json"}, json={}),
            "上游未返回 WAV 音频",
        ),
        (
            httpx.Response(500, json={"detail": "F:/private/model failed"}),
            "昔涟语音生成失败",
        ),
    ],
)
async def test_genie_provider_rejects_unsafe_upstream_responses(
    response: httpx.Response,
    message: str,
) -> None:
    provider = GenieTTSProvider(
        _genie_settings(),
        transport=httpx.MockTransport(lambda _: response),
    )

    with pytest.raises(VoiceProviderError, match=message) as caught:
        await provider.synthesize("测试")

    assert "private" not in str(caught.value)


@pytest.mark.anyio
async def test_genie_provider_maps_timeout_and_size_limit() -> None:
    async def timeout(_: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("F:/private/model timed out")

    timeout_provider = GenieTTSProvider(
        _genie_settings(),
        transport=httpx.MockTransport(timeout),
    )
    oversized_provider = GenieTTSProvider(
        _genie_settings(tts_max_audio_bytes=12),
        transport=httpx.MockTransport(
            lambda _: httpx.Response(
                200,
                headers={"content-type": "audio/wav"},
                content=_wav_signature(b"too-large"),
            )
        ),
    )

    with pytest.raises(VoiceProviderError, match="语音服务响应超时") as caught:
        await timeout_provider.synthesize("测试")
    with pytest.raises(VoiceProviderError, match="超过大小限制"):
        await oversized_provider.synthesize("测试")

    assert "private" not in str(caught.value)


def test_provider_factory_preserves_legacy_default_and_selects_genie() -> None:
    assert isinstance(create_voice_provider(_configured_settings()), GPTSoVITSProvider)
    assert isinstance(create_voice_provider(_genie_settings()), GenieTTSProvider)


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
        provider_name = "genie_tts"

        async def synthesize(self, text: str):
            assert text == "你好，昔涟。"
            from app.voice.models import SynthesizedVoiceAudio

            return SynthesizedVoiceAudio(
                content=_wav_signature(b"route-wave"),
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
    assert response.content == _wav_signature(b"route-wave")
    assert response.headers["content-type"].startswith("audio/wav")
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-voice-provider"] == "genie-tts"


def test_route_validates_synthesis_text() -> None:
    with TestClient(create_app()) as client:
        empty = client.post("/api/voice/synthesize", json={"text": ""})
        too_long = client.post(
            "/api/voice/synthesize",
            json={"text": "昔" * 601},
        )

    assert empty.status_code == 422
    assert too_long.status_code == 422
