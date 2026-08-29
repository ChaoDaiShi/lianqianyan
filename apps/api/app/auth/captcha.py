"""统一的人机验证分发：Turnstile 优先，Vaptcha 兜底。

前端按 /api/public/config 下发的 captcha_chain 渲染验证组件并把实际使用的
provider 随请求提交；后端只校验对应 provider 的凭证。
"""

from __future__ import annotations

import httpx

from app.core.config import Settings

TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
VAPTCHA_VERIFY_URL = "https://api.vaptcha.com/verify"
VAPTCHA_SUCCESS_CODE = "0103"

SUPPORTED_PROVIDERS = ("turnstile", "vaptcha")


class CaptchaError(ValueError):
    """验证凭证无效或验证服务不可用。"""


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
            raise CaptchaError("complete the verification challenge")
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
                response = await client.post(TURNSTILE_SITEVERIFY_URL, data=payload)
                response.raise_for_status()
                result = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise CaptchaError(
                "verification service is temporarily unavailable"
            ) from exc
        if not isinstance(result, dict) or result.get("success") is not True:
            raise CaptchaError("verification challenge was not accepted")


class VaptchaVerifier:
    """Vaptcha 二次校验：token 由前端 v3.js 的 getToken() 取得，一次性使用。"""

    def __init__(
        self,
        settings: Settings,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.settings = settings
        self.transport = transport

    async def verify(self, token: str | None, remote_ip: str | None) -> None:
        if not self.settings.vaptcha_configured():
            return
        cleaned = (token or "").strip()
        if not cleaned:
            raise CaptchaError("complete the verification challenge")
        payload = {
            "id": self.settings.vaptcha_vid,
            "secretkey": self.settings.vaptcha_key,
            "token": cleaned,
        }
        if remote_ip:
            payload["ip"] = remote_ip
        try:
            async with httpx.AsyncClient(
                timeout=self.settings.turnstile_timeout,
                transport=self.transport,
                follow_redirects=False,
            ) as client:
                response = await client.post(VAPTCHA_VERIFY_URL, data=payload)
                response.raise_for_status()
                result = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise CaptchaError(
                "verification service is temporarily unavailable"
            ) from exc
        if not isinstance(result, dict) or result.get("code") != VAPTCHA_SUCCESS_CODE:
            raise CaptchaError("verification challenge was not accepted")


def captcha_chain(settings: Settings) -> list[str]:
    """按部署偏好返回可用 provider 的优先级链。"""
    mode = (settings.captcha_mode or "auto").strip().lower()
    if mode == "off":
        return []
    if mode == "turnstile":
        return ["turnstile"] if settings.turnstile_configured() else []
    if mode == "vaptcha":
        return ["vaptcha"] if settings.vaptcha_configured() else []
    chain: list[str] = []
    if settings.turnstile_configured():
        chain.append("turnstile")
    if settings.vaptcha_configured():
        chain.append("vaptcha")
    return chain


async def verify_captcha(
    provider: str | None,
    token: str | None,
    remote_ip: str | None,
    settings: Settings,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> None:
    """校验请求携带的验证凭证；未配置任何 provider 时不做校验。"""
    chain = captcha_chain(settings)
    if not chain:
        return
    cleaned_provider = (provider or "").strip().lower() or chain[0]
    if cleaned_provider not in SUPPORTED_PROVIDERS:
        raise CaptchaError("unsupported captcha provider")
    if cleaned_provider not in chain:
        raise CaptchaError("captcha provider is not enabled")
    if cleaned_provider == "vaptcha":
        await VaptchaVerifier(settings, transport=transport).verify(token, remote_ip)
        return
    await TurnstileVerifier(settings, transport=transport).verify(token, remote_ip)
