from __future__ import annotations

import asyncio

import httpx
import pytest

from app.core.config import get_settings
from app.llm import get_llm_provider
from app.llm.openai_compatible_provider import OpenAICompatibleProvider
from app.llm.provider import LLMMessage


def _provider(handler, *, base_url: str = "https://llm.test"):
    return OpenAICompatibleProvider(
        base_url,
        "secret-key",
        "demo-model",
        3,
        transport=httpx.MockTransport(handler),
    )


def test_provider_extracts_content_and_metadata():
    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == "https://llm.test/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer secret-key"
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "真实回答"}}],
                "usage": {"prompt_tokens": 2},
            },
        )

    result = asyncio.run(_provider(handler).chat([LLMMessage("user", "问题")]))
    assert result.content == "真实回答"
    assert result.usage == {
        "provider": "openai_compatible",
        "model": "demo-model",
        "prompt_tokens": 2,
    }


@pytest.mark.parametrize("status", [401, 403, 429, 500])
def test_provider_sanitizes_http_errors(status: int):
    provider = _provider(lambda request: httpx.Response(status, text="secret-key leaked"))
    with pytest.raises(RuntimeError) as exc_info:
        asyncio.run(provider.chat([LLMMessage("user", "问题")]))
    assert "secret-key" not in str(exc_info.value)
    assert str(status) in str(exc_info.value)


def test_provider_rejects_invalid_json_and_empty_choices():
    invalid = _provider(lambda request: httpx.Response(200, content=b"not-json"))
    with pytest.raises(RuntimeError):
        asyncio.run(invalid.chat([LLMMessage("user", "问题")]))

    empty = _provider(lambda request: httpx.Response(200, json={"choices": []}))
    with pytest.raises(RuntimeError):
        asyncio.run(empty.chat([LLMMessage("user", "问题")]))


def test_provider_reports_timeout_without_exposing_request_details():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("upstream timed out", request=request)

    provider = _provider(handler)
    with pytest.raises(RuntimeError, match="timed out"):
        asyncio.run(provider.chat([LLMMessage("user", "问题")]))


    assert OpenAICompatibleProvider.endpoint_for("https://llm.test") == "https://llm.test/v1/chat/completions"
    assert OpenAICompatibleProvider.endpoint_for("https://llm.test/") == "https://llm.test/v1/chat/completions"
    assert OpenAICompatibleProvider.endpoint_for("https://llm.test/v1") == "https://llm.test/v1/chat/completions"
    assert OpenAICompatibleProvider.endpoint_for("https://llm.test/v1/") == "https://llm.test/v1/chat/completions"


def test_provider_selection_uses_mock_without_complete_config(monkeypatch):
    for key in ("EDUCATION_LLM_BASE_URL", "EDUCATION_LLM_API_KEY", "EDUCATION_LLM_MODEL"):
        monkeypatch.delenv(key, raising=False)
    get_settings.cache_clear()
    assert get_llm_provider().name == "mock"


def test_provider_selection_uses_openai_compatible_with_complete_config(monkeypatch):
    monkeypatch.setenv("EDUCATION_LLM_BASE_URL", "https://llm.test")
    monkeypatch.setenv("EDUCATION_LLM_API_KEY", "secret-key")
    monkeypatch.setenv("EDUCATION_LLM_MODEL", "demo-model")
    get_settings.cache_clear()
    provider = get_llm_provider()
    assert provider.name == "openai_compatible"
    monkeypatch.delenv("EDUCATION_LLM_BASE_URL", raising=False)
    monkeypatch.delenv("EDUCATION_LLM_API_KEY", raising=False)
    monkeypatch.delenv("EDUCATION_LLM_MODEL", raising=False)
    get_settings.cache_clear()
