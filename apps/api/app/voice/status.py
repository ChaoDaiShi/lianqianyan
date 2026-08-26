from __future__ import annotations

from app.core.config import Settings, get_settings
from app.voice.models import VoiceStatus


def get_voice_status(settings: Settings | None = None) -> VoiceStatus:
    active_settings = settings or get_settings()
    configured = active_settings.tts_configured()
    return VoiceStatus(
        provider="gpt_sovits" if configured else "unavailable",
        configured=configured,
    )
