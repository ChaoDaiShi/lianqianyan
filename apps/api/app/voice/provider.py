from __future__ import annotations

from typing import Protocol

from app.core.config import Settings
from app.voice.minimax import MiniMaxTTSProvider
from app.voice.models import SynthesizedVoiceAudio


class VoiceSynthesisProvider(Protocol):
    provider_name: str

    async def synthesize(self, text: str) -> SynthesizedVoiceAudio: ...


def create_voice_provider(settings: Settings) -> VoiceSynthesisProvider:
    """Return the only supported output provider; it reports missing config itself."""
    return MiniMaxTTSProvider(settings)
