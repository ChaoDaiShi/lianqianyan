from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field, field_validator

VOICE_ATTRIBUTION = (
    "GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，"
    "自练作者为KearDawn"
)


class VoiceStatus(BaseModel):
    provider: Literal["genie_tts", "gpt_sovits", "account_tts", "unavailable"]
    voice: Literal["cyrene"] = "cyrene"
    configured: bool
    fallback: Literal["browser_speech"] = "browser_speech"
    attribution: str = VOICE_ATTRIBUTION


class VoiceSynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=600)

    @field_validator("text")
    @classmethod
    def reject_whitespace_only(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("speech text must not be blank")
        return cleaned


@dataclass(frozen=True)
class SynthesizedVoiceAudio:
    content: bytes
    media_type: str


def has_wav_signature(content: bytes) -> bool:
    return (
        len(content) >= 12
        and content[:4] == b"RIFF"
        and content[8:12] == b"WAVE"
    )
