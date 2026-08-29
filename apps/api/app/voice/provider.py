from __future__ import annotations

from typing import Protocol

from app.core.config import Settings
from app.voice.genie_embedded import EmbeddedGenieTTSProvider
from app.voice.gpt_sovits import GPTSoVITSProvider
from app.voice.gpt_sovits import VoiceNotConfiguredError
from app.voice.models import SynthesizedVoiceAudio


class VoiceSynthesisProvider(Protocol):
    provider_name: str

    async def synthesize(self, text: str) -> SynthesizedVoiceAudio: ...


class UnavailableGenieTTSProvider:
    provider_name = "genie_tts"

    async def synthesize(self, text: str) -> SynthesizedVoiceAudio:
        raise VoiceNotConfiguredError("昔涟语音服务未配置")


def create_voice_provider(
    settings: Settings,
    *,
    embedded_provider: EmbeddedGenieTTSProvider | None = None,
) -> VoiceSynthesisProvider:
    if settings.tts_provider == "genie":
        return embedded_provider or UnavailableGenieTTSProvider()
    return GPTSoVITSProvider(settings)
