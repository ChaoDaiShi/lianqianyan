from __future__ import annotations

import asyncio
from typing import Protocol

from app.voice.gpt_sovits import VoiceProviderError
from app.voice.genie_runtime import GenieRuntimeError
from app.voice.models import SynthesizedVoiceAudio


class EmbeddedGenieRuntime(Protocol):
    def synthesize_to_wav(self, text: str) -> bytes: ...


class EmbeddedGenieTTSProvider:
    provider_name = "genie_tts"

    def __init__(self, runtime: EmbeddedGenieRuntime) -> None:
        self._runtime = runtime
        self._synthesis_lock = asyncio.Lock()

    async def synthesize(self, text: str) -> SynthesizedVoiceAudio:
        try:
            async with self._synthesis_lock:
                content = await asyncio.to_thread(
                    self._runtime.synthesize_to_wav,
                    text,
                )
        except GenieRuntimeError as exc:
            raise VoiceProviderError("昔涟语音生成失败") from exc
        except Exception as exc:
            raise VoiceProviderError("昔涟语音生成失败") from exc
        return SynthesizedVoiceAudio(content=content, media_type="audio/wav")
