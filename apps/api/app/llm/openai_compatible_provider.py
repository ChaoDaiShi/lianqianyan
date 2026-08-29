from __future__ import annotations

import json
from typing import Any

import httpx

from app.llm.provider import BaseLLMProvider, LLMMessage, LLMResult


class OpenAICompatibleProvider(BaseLLMProvider):
    """Small httpx client for OpenAI-compatible chat completion APIs."""

    name = "openai_compatible"

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        timeout: float,
        *,
        client: httpx.AsyncClient | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._base_url = base_url.strip()
        self._api_key = api_key
        self._model = model
        self._timeout = timeout
        self._client = client
        self._transport = transport

    @staticmethod
    def endpoint_for(base_url: str) -> str:
        normalized = base_url.rstrip("/")
        if normalized.endswith("/v1"):
            return f"{normalized}/chat/completions"
        return f"{normalized}/v1/chat/completions"

    async def chat(self, messages: list[LLMMessage], **kwargs: Any) -> LLMResult:
        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(
            timeout=self._timeout,
            transport=self._transport,
        )
        try:
            headers = {"Authorization": f"Bearer {self._api_key}"} if self._api_key else {}
            response = await client.post(
                self.endpoint_for(self._base_url),
                headers=headers,
                json={
                    "model": self._model,
                    "messages": [{"role": item.role, "content": item.content} for item in messages],
                },
            )
            if response.status_code >= 400:
                raise RuntimeError(f"openai-compatible provider returned HTTP {response.status_code}")
            try:
                payload = response.json()
            except (json.JSONDecodeError, ValueError) as exc:
                raise RuntimeError("openai-compatible provider returned invalid JSON") from exc
            try:
                content = payload["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError) as exc:
                raise RuntimeError("openai-compatible provider returned no choices") from exc
            if not isinstance(content, str) or not content.strip():
                raise RuntimeError("openai-compatible provider returned empty content")
            usage = payload.get("usage") if isinstance(payload, dict) else None
            return LLMResult(
                content=content,
                usage={
                    "provider": self.name,
                    "model": self._model,
                    **(usage if isinstance(usage, dict) else {}),
                },
            )
        except httpx.TimeoutException as exc:
            raise RuntimeError("openai-compatible provider timed out") from exc
        except httpx.RequestError as exc:
            raise RuntimeError("openai-compatible provider request failed") from exc
        finally:
            if owns_client:
                await client.aclose()
