from __future__ import annotations

import httpx

from app.core.config import Settings
from app.voice.models import SynthesizedVoiceAudio

ACCEPTED_WAV_MEDIA_TYPES = {"audio/wav", "audio/x-wav", "audio/wave"}


class VoiceProviderError(RuntimeError):
    """A safe public-facing GPT-SOVITS failure without internal paths."""


class VoiceNotConfiguredError(VoiceProviderError):
    """Raised when the deployment has no complete Cyrene voice config."""


class GPTSoVITSProvider:
    def __init__(
        self,
        settings: Settings,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._settings = settings
        self._transport = transport

    def _payload(self, text: str) -> dict[str, object]:
        return {
            "text": text,
            "text_lang": "zh",
            "ref_audio_path": self._settings.tts_reference_audio_path,
            "prompt_text": self._settings.tts_reference_text,
            "prompt_lang": "zh",
            "text_split_method": "cut5",
            "batch_size": 1,
            "media_type": "wav",
            "streaming_mode": False,
            "speed_factor": 1.0,
        }

    async def synthesize(self, text: str) -> SynthesizedVoiceAudio:
        base_url = self._settings.normalized_tts_base_url()
        if not self._settings.tts_configured() or base_url is None:
            raise VoiceNotConfiguredError("昔涟语音服务未配置")

        try:
            async with httpx.AsyncClient(
                timeout=self._settings.tts_timeout,
                transport=self._transport,
                follow_redirects=False,
            ) as client:
                async with client.stream(
                    "POST",
                    f"{base_url}/tts",
                    json=self._payload(text),
                ) as response:
                    if not response.is_success:
                        raise VoiceProviderError("昔涟语音生成失败")
                    media_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
                    if media_type not in ACCEPTED_WAV_MEDIA_TYPES:
                        raise VoiceProviderError("上游未返回 WAV 音频")

                    chunks: list[bytes] = []
                    total_bytes = 0
                    async for chunk in response.aiter_bytes():
                        total_bytes += len(chunk)
                        if total_bytes > self._settings.tts_max_audio_bytes:
                            raise VoiceProviderError("昔涟语音音频超过大小限制")
                        chunks.append(chunk)
        except VoiceProviderError:
            raise
        except httpx.TimeoutException as exc:
            raise VoiceProviderError("昔涟语音服务响应超时") from exc
        except httpx.HTTPError as exc:
            raise VoiceProviderError("昔涟语音服务暂时不可用") from exc

        return SynthesizedVoiceAudio(
            content=b"".join(chunks),
            media_type="audio/wav",
        )
