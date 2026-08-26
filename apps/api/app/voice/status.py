from __future__ import annotations

from app.core.config import Settings, get_settings
from app.voice.models import VoiceStatus


def get_voice_status(settings: Settings | None = None) -> VoiceStatus:
    active_settings = settings or get_settings()
    configured = active_settings.tts_configured()
    provider = "unavailable"
    if configured:
        provider = (
            "genie_tts"
            if active_settings.tts_provider == "genie"
            else "gpt_sovits"
        )
    return VoiceStatus(
        provider=provider,
        configured=configured,
    )
