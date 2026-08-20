from __future__ import annotations

from pydantic import BaseModel

from app.core.config import Settings, get_settings


class LlmStatus(BaseModel):
    provider: str
    model: str | None = None
    configured: bool


def is_llm_configured(settings: Settings) -> bool:
    return all(
        value and value.strip()
        for value in (settings.llm_base_url, settings.llm_api_key, settings.llm_model)
    )


def get_llm_status() -> LlmStatus:
    settings = get_settings()
    if is_llm_configured(settings):
        return LlmStatus(
            provider="openai_compatible",
            model=settings.llm_model.strip() if settings.llm_model else None,
            configured=True,
        )
    return LlmStatus(provider="mock", configured=False)
