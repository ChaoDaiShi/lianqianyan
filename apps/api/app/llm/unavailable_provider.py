"""Explicit provider used when no external language model is configured."""

from __future__ import annotations

from typing import Any

from app.llm.provider import BaseLLMProvider, LLMMessage, LLMResult


class LLMNotConfiguredError(RuntimeError):
    """Raised when a caller requests model generation without a provider."""


class UnavailableLLMProvider(BaseLLMProvider):
    """Never fabricates model output; TutorService may use its grounded fallback."""

    name = "unavailable"

    async def chat(
        self,
        messages: list[LLMMessage],
        **kwargs: Any,
    ) -> LLMResult:
        del messages, kwargs
        raise LLMNotConfiguredError("external language model is not configured")
