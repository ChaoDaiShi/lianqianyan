from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings

router = APIRouter(prefix="/public", tags=["public"])


class PublicRuntimeConfig(BaseModel):
    turnstile_enabled: bool
    turnstile_site_key: str | None = None


@router.get("/config", response_model=PublicRuntimeConfig)
def public_config(settings: Settings = Depends(get_settings)) -> PublicRuntimeConfig:
    enabled = settings.turnstile_configured()
    return PublicRuntimeConfig(
        turnstile_enabled=enabled,
        turnstile_site_key=(settings.turnstile_site_key or "").strip() if enabled else None,
    )
