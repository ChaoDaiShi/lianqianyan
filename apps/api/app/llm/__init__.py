"""LLM provider selection and public exports."""

from app.core.config import get_settings
from app.llm.provider import (
    BaseLLMProvider,
    BaseProviderRegistry,
    LLMMessage,
    LLMResult,
)
from app.llm.status import LlmStatus, get_llm_status, is_llm_configured


def get_llm_provider() -> BaseLLMProvider:
    settings = get_settings()
    if is_llm_configured(settings):
        from app.llm.openai_compatible_provider import OpenAICompatibleProvider

        return OpenAICompatibleProvider(
            settings.llm_base_url or "",
            settings.llm_api_key or "",
            settings.llm_model or "",
            settings.llm_timeout,
        )

    from app.llm.unavailable_provider import UnavailableLLMProvider

    return UnavailableLLMProvider()


__all__ = [
    "BaseLLMProvider",
    "BaseProviderRegistry",
    "LLMMessage",
    "LLMResult",
    "LlmStatus",
    "get_llm_provider",
    "get_llm_status",
    "is_llm_configured",
]
