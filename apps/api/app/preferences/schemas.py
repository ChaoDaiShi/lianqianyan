from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

ThemePreference = Literal["system", "light", "dark"]
ModelKind = Literal["llm", "tts"]
ModelProvider = Literal["openai_chat", "openai_speech", "gpt_sovits"]


class ModelProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    kind: ModelKind
    provider: ModelProvider
    base_url: str = Field(min_length=1, max_length=500)
    model: str | None = Field(default=None, max_length=160)
    voice: str | None = Field(default=None, max_length=120)
    api_key: str | None = Field(default=None, max_length=4096)

    @field_validator("name", "base_url")
    @classmethod
    def strip_required(cls, value: str) -> str:
        return value.strip()

    @field_validator("model", "voice", "api_key")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        cleaned = value.strip() if value else ""
        return cleaned or None


class ModelProfileOut(BaseModel):
    id: str
    name: str
    kind: ModelKind
    provider: ModelProvider
    base_url: str
    model: str | None
    voice: str | None
    has_api_key: bool
    created_at: datetime


class ThemeUpdate(BaseModel):
    theme: ThemePreference


class ModelSelectionUpdate(BaseModel):
    profile_id: str | None = Field(default=None, max_length=36)


class RuntimeDefaultOut(BaseModel):
    configured: bool
    provider: str
    model: str | None = None


class AccountSettingsOut(BaseModel):
    theme: ThemePreference
    selected_llm_profile_id: str | None
    selected_tts_profile_id: str | None
    profiles: list[ModelProfileOut]
    default_llm: RuntimeDefaultOut
    default_tts: RuntimeDefaultOut
    custom_model_hosts: list[str]
    secret_storage_configured: bool
