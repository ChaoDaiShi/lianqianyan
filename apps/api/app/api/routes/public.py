from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter, Depends

from app.auth.captcha import captcha_chain
from app.core.config import Settings, get_settings

router = APIRouter(prefix="/public", tags=["public"])


class PublicRuntimeConfig(BaseModel):
    turnstile_enabled: bool
    turnstile_site_key: str | None = None
    captcha_chain: list[str] = []
    vaptcha_vid: str | None = None


@router.get("/config", response_model=PublicRuntimeConfig)
def public_config(settings: Settings = Depends(get_settings)) -> PublicRuntimeConfig:
    turnstile_enabled = settings.turnstile_configured()
    return PublicRuntimeConfig(
        turnstile_enabled=turnstile_enabled,
        turnstile_site_key=(settings.turnstile_site_key or "").strip()
        if turnstile_enabled
        else None,
        captcha_chain=captcha_chain(settings),
        vaptcha_vid=(settings.vaptcha_vid or "").strip()
        if settings.vaptcha_configured()
        else None,
    )
