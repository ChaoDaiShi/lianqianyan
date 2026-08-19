"""LLM provider selection and public exports."""

from app.core.config import get_settings
from app.llm.provider import (
    BaseLLMProvider,
    BaseProviderRegistry,
    LLMMessage,
    LLMResult,
)


def get_llm_provider() -> BaseLLMProvider:
    settings = get_settings()
    if all(
        value and value.strip()
        for value in (settings.llm_base_url, settings.llm_api_key, settings.llm_model)
    ):
        from app.llm.openai_compatible_provider import OpenAICompatibleProvider

        return OpenAICompatibleProvider(
            settings.llm_base_url or "",
            settings.llm_api_key or "",
            settings.llm_model or "",
            settings.llm_timeout,
        )

    from app.llm.mock_provider import MockTutorProvider

    return MockTutorProvider()


__all__ = [
    "BaseLLMProvider",
    "BaseProviderRegistry",
    "LLMMessage",
    "LLMResult",
    "get_llm_provider",
]
