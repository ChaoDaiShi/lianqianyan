from __future__ import annotations

import httpx
import pytest

from app.auth.captcha import (
    VAPTCHA_VERIFY_URL,
    CaptchaError,
    VaptchaVerifier,
    captcha_chain,
    verify_captcha,
)
from app.core.config import Settings


def make_settings(**overrides: str) -> Settings:
    values = {
        "turnstile_site_key": "",
        "turnstile_secret_key": "",
        "vaptcha_vid": "",
        "vaptcha_key": "",
        "captcha_mode": "auto",
    }
    values.update(overrides)
    return Settings(**values)


class MockTransport(httpx.AsyncBaseTransport):
    def __init__(self, handler):
        self._handler = handler

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        return self._handler(request)


@pytest.mark.anyio
async def test_vaptcha_verifier_accepts_success_code() -> None:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"code": "0103", "msg": "验证成功"})

    verifier = VaptchaVerifier(
        make_settings(vaptcha_vid="vid-1", vaptcha_key="key-1"),
        transport=MockTransport(handler),
    )
    await verifier.verify("token-1", "127.0.0.1")
    assert len(calls) == 1
    assert calls[0].url.host == "api.vaptcha.com"
    body = (await calls[0].aread()).decode()
    assert "vid-1" in body and "key-1" in body and "token-1" in body


@pytest.mark.anyio
async def test_vaptcha_verifier_rejects_failure_code() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"code": "0104", "msg": "验证失败"})

    verifier = VaptchaVerifier(
        make_settings(vaptcha_vid="vid-1", vaptcha_key="key-1"),
        transport=MockTransport(handler),
    )
    with pytest.raises(CaptchaError):
        await verifier.verify("token-1", None)


@pytest.mark.anyio
async def test_vaptcha_verifier_reports_network_outage() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    verifier = VaptchaVerifier(
        make_settings(vaptcha_vid="vid-1", vaptcha_key="key-1"),
        transport=MockTransport(handler),
    )
    with pytest.raises(CaptchaError, match="temporarily unavailable"):
        await verifier.verify("token-1", None)


@pytest.mark.anyio
async def test_verify_captcha_without_any_provider_is_noop() -> None:
    await verify_captcha(None, None, None, make_settings())


@pytest.mark.anyio
async def test_verify_captcha_dispatches_by_provider() -> None:
    seen_urls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_urls.append(str(request.url))
        return httpx.Response(200, json={"code": "0103"})

    settings = make_settings(
        turnstile_site_key="site", turnstile_secret_key="secret",
        vaptcha_vid="vid", vaptcha_key="key",
    )
    transport = MockTransport(handler)
    await verify_captcha("vaptcha", "t", None, settings, transport=transport)
    assert seen_urls[-1].startswith(VAPTCHA_VERIFY_URL)
    with pytest.raises(CaptchaError):
        await verify_captcha("vaptcha", "", None, settings, transport=transport)


@pytest.mark.anyio
async def test_verify_captcha_rejects_provider_outside_chain() -> None:
    settings = make_settings(vaptcha_vid="vid", vaptcha_key="key")
    with pytest.raises(CaptchaError, match="not enabled"):
        await verify_captcha("turnstile", "t", None, settings)


def test_captcha_chain_modes() -> None:
    both = make_settings(
        turnstile_site_key="site", turnstile_secret_key="secret",
        vaptcha_vid="vid", vaptcha_key="key",
    )
    assert captcha_chain(both) == ["turnstile", "vaptcha"]
    assert captcha_chain(make_settings(vaptcha_vid="v", vaptcha_key="k")) == ["vaptcha"]
    assert captcha_chain(make_settings(captcha_mode="vaptcha", **{
        "turnstile_site_key": "site", "turnstile_secret_key": "secret",
        "vaptcha_vid": "vid", "vaptcha_key": "key",
    })) == ["vaptcha"]
    assert captcha_chain(make_settings(captcha_mode="off", **{
        "turnstile_site_key": "site", "turnstile_secret_key": "secret",
    })) == []
