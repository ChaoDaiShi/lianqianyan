from __future__ import annotations

import httpx
import pytest

from app.core.config import Settings
from app.voice.minimax import T2A_URL, MiniMaxTTSProvider
from app.voice.errors import VoiceNotConfiguredError, VoiceProviderError


def make_settings(**overrides: str) -> Settings:
    values = {
        "minimax_api_key": "key-1",
        "minimax_group_id": "group-1",
        "minimax_model": "",
        "minimax_voice_id": "",
    }
    values.update(overrides)
    return Settings(**values)


class MockTransport(httpx.AsyncBaseTransport):
    def __init__(self, handler):
        self._handler = handler

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        return self._handler(request)


@pytest.mark.anyio
async def test_minimax_provider_decodes_hex_audio() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json={
                "data": {"audio": b"ID3mp3bytes".hex()},
                "base_resp": {"status_code": 0, "status_msg": "success"},
            },
        )

    provider = MiniMaxTTSProvider(make_settings(), transport=MockTransport(handler))
    audio = await provider.synthesize("你好，我是小涟。")
    assert audio.media_type == "audio/mpeg"
    assert audio.content == b"ID3mp3bytes"
    assert requests[0].url.host == "api.minimax.chat"
    assert "GroupId=group-1" in str(requests[0].url)
    body = (await requests[0].aread()).decode()
    assert "speech-02-hd" in body and "female-shaonv" in body


@pytest.mark.anyio
async def test_minimax_provider_surfaces_api_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"base_resp": {"status_code": 1004, "status_msg": "invalid api key"}},
        )

    provider = MiniMaxTTSProvider(make_settings(), transport=MockTransport(handler))
    with pytest.raises(VoiceProviderError, match="invalid api key"):
        await provider.synthesize("你好")


@pytest.mark.anyio
async def test_minimax_provider_reports_network_outage() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    provider = MiniMaxTTSProvider(make_settings(), transport=MockTransport(handler))
    with pytest.raises(VoiceProviderError, match="暂时不可用"):
        await provider.synthesize("你好")


@pytest.mark.anyio
async def test_minimax_provider_requires_configuration() -> None:
    provider = MiniMaxTTSProvider(make_settings(minimax_api_key=""))
    with pytest.raises(VoiceNotConfiguredError):
        await provider.synthesize("你好")
    assert T2A_URL.startswith("https://api.minimax.chat")
