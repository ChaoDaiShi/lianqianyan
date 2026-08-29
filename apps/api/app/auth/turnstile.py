from __future__ import annotations

import httpx

from app.core.config import Settings, get_settings

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


class TurnstileError(ValueError):
    pass


class TurnstileVerifier:
    def __init__(
        self,
        settings: Settings,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.settings = settings
        self.transport = transport

    async def verify(self, token: str | None, remote_ip: str | None) -> None:
        if not self.settings.turnstile_configured():
            return
        cleaned = (token or "").strip()
        if not cleaned:
            raise TurnstileError("complete the verification challenge")
        payload = {
            "secret": self.settings.turnstile_secret_key,
            "response": cleaned,
        }
        if remote_ip:
            payload["remoteip"] = remote_ip
        try:
            async with httpx.AsyncClient(
                timeout=self.settings.turnstile_timeout,
                transport=self.transport,
                follow_redirects=False,
            ) as client:
                response = await client.post(SITEVERIFY_URL, data=payload)
                response.raise_for_status()
                result = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise TurnstileError("verification service is temporarily unavailable") from exc
        if not isinstance(result, dict) or result.get("success") is not True:
            raise TurnstileError("verification challenge was not accepted")


def get_turnstile_verifier() -> TurnstileVerifier:
    return TurnstileVerifier(get_settings())
