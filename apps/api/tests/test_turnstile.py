from __future__ import annotations

import httpx
import pytest

from app.auth.turnstile import SITEVERIFY_URL, TurnstileError, TurnstileVerifier
from app.core.config import Settings


@pytest.mark.anyio
async def test_turnstile_is_noop_when_deployment_did_not_configure_it() -> None:
    await TurnstileVerifier(Settings()).verify(None, "127.0.0.1")


@pytest.mark.anyio
async def test_turnstile_requires_token_and_validates_server_side() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"success": True})

    verifier = TurnstileVerifier(
        Settings(turnstile_site_key="site", turnstile_secret_key="secret"),
        transport=httpx.MockTransport(handler),
    )
    with pytest.raises(TurnstileError, match="complete"):
        await verifier.verify(None, "127.0.0.1")
    await verifier.verify("verified-token", "127.0.0.1")
    assert requests[0].url == SITEVERIFY_URL
    assert b"secret=secret" in requests[0].content
    assert b"response=verified-token" in requests[0].content


@pytest.mark.anyio
async def test_turnstile_rejects_provider_failure() -> None:
    verifier = TurnstileVerifier(
        Settings(turnstile_site_key="site", turnstile_secret_key="secret"),
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json={"success": False})),
    )
    with pytest.raises(TurnstileError, match="not accepted"):
        await verifier.verify("bad", None)
