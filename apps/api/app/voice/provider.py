from __future__ import annotations

from typing import Protocol

from app.core.config import Settings
from app.voice.genie import GenieTTSProvider
from app.voice.gpt_sovits import GPTSoVITSProvider
from app.voice.models import SynthesizedVoiceAudio


class VoiceSynthesisProvider(Protocol):
    provider_name: str

    async def synthesize(self, text: str) -> SynthesizedVoiceAudio: ...


def create_voice_provider(settings: Settings) -> VoiceSynthesisProvider:
    if settings.tts_provider == "genie":
        return GenieTTSProvider(settings)
    return GPTSoVITSProvider(settings)
