from __future__ import annotations

from app.core.config import Settings, get_settings
from app.voice.models import VoiceStatus


def get_voice_status(
    settings: Settings | None = None,
) -> VoiceStatus:
    active_settings = settings or get_settings()
    configured = active_settings.minimax_configured()
    return VoiceStatus(provider="minimax" if configured else "unavailable", configured=configured)
