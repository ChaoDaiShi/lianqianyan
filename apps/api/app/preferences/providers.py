from __future__ import annotations

import httpx
from sqlalchemy.orm import Session

from app.auth.models import AuthAccount
from app.core.config import Settings
from app.llm import BaseLLMProvider, get_llm_provider
from app.llm.openai_compatible_provider import OpenAICompatibleProvider
from app.preferences.service import ModelProfileService
from app.voice.models import SynthesizedVoiceAudio, has_wav_signature
from app.voice.provider import VoiceSynthesisProvider, create_voice_provider
from app.voice.gpt_sovits import VoiceProviderError


def account_llm_provider(
    db: Session,
    settings: Settings,
    account: AuthAccount | None,
) -> BaseLLMProvider:
    if account is None:
        return get_llm_provider()
    service = ModelProfileService(db, settings)
    profile = service.selected_profile(account, "llm")
    if profile is None:
        return get_llm_provider()
    return OpenAICompatibleProvider(
        profile.base_url,
        service.api_key(profile) or "",
        profile.model or "",
        settings.llm_timeout,
    )


class AccountHTTPVoiceProvider:
    provider_name = "account_tts"

    def __init__(self, profile, api_key: str | None, settings: Settings) -> None:
        self.profile = profile
        self.api_key = api_key
        self.settings = settings

    @staticmethod
    def _speech_endpoint(base_url: str) -> str:
        normalized = base_url.rstrip("/")
        return f"{normalized}/audio/speech" if normalized.endswith("/v1") else f"{normalized}/v1/audio/speech"

    async def synthesize(self, text: str) -> SynthesizedVoiceAudio:
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        if self.profile.provider == "openai_speech":
            url = self._speech_endpoint(self.profile.base_url)
            payload = {
                "model": self.profile.model,
                "input": text,
                "voice": self.profile.voice or "alloy",
                "response_format": "wav",
            }
        else:
            url = f"{self.profile.base_url.rstrip('/')}/tts"
            payload = {
                "text": text,
                "text_lang": "zh",
                "ref_audio_path": self.profile.voice,
                "prompt_text": self.settings.tts_reference_text,
                "prompt_lang": "zh",
                "media_type": "wav",
                "streaming_mode": False,
            }
        try:
            async with httpx.AsyncClient(timeout=self.settings.tts_timeout, follow_redirects=False) as client:
                response = await client.post(url, json=payload, headers=headers)
                if not response.is_success:
                    raise VoiceProviderError("外部语音模型生成失败")
                content = response.content
        except VoiceProviderError:
            raise
        except httpx.HTTPError as exc:
            raise VoiceProviderError("外部语音模型暂时不可用") from exc
        if len(content) > self.settings.tts_max_audio_bytes:
            raise VoiceProviderError("外部语音音频超过大小限制")
        if not has_wav_signature(content):
            raise VoiceProviderError("外部语音模型未返回有效 WAV")
        return SynthesizedVoiceAudio(content=content, media_type="audio/wav")


def account_voice_provider(
    db: Session,
    settings: Settings,
    account: AuthAccount | None,
    *,
    embedded_provider=None,
) -> VoiceSynthesisProvider:
    if account is None:
        return create_voice_provider(settings, embedded_provider=embedded_provider)
    service = ModelProfileService(db, settings)
    profile = service.selected_profile(account, "tts")
    if profile is None:
        return create_voice_provider(settings, embedded_provider=embedded_provider)
    return AccountHTTPVoiceProvider(profile, service.api_key(profile), settings)
