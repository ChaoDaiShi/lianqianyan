from __future__ import annotations

from urllib.parse import urlparse

import httpx

from app.core.config import Settings, get_settings
from app.network.models import NetworkSearchResult, SearchLanguage
from app.network.provider import BaseNetworkSearchProvider, NetworkSearchUnavailable, UNAVAILABLE_MESSAGE


class AnySearchProvider(BaseNetworkSearchProvider):
    provider_name = "anysearch"
    def __init__(self, settings: Settings | None = None, *, transport: httpx.AsyncBaseTransport | None = None) -> None:
        active = settings or get_settings()
        self._api_key = (active.anysearch_api_key or "").strip()
        self._base_url = active.anysearch_base_url.rstrip("/")
        self._timeout = active.anysearch_timeout
        self._transport = transport

    async def search(self, query: str, limit: int, language: SearchLanguage) -> list[NetworkSearchResult]:
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        payload = {
            "query": query,
            "max_results": limit,
            "tag": "general.general",
            "language": language,
            "format": "markdown",
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout, transport=self._transport, follow_redirects=False) as client:
                response = await client.post(f"{self._base_url}/v1/search", headers=headers, json=payload)
                response.raise_for_status()
                body = response.json()
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            raise NetworkSearchUnavailable(UNAVAILABLE_MESSAGE) from exc

        raw_results = (body.get("data") or {}).get("results", []) if isinstance(body, dict) else []
        if not isinstance(raw_results, list):
            raise NetworkSearchUnavailable(UNAVAILABLE_MESSAGE)
        results: list[NetworkSearchResult] = []
        for item in raw_results:
            if not isinstance(item, dict):
                continue
            title, url = item.get("title"), item.get("url")
            parsed = urlparse(url) if isinstance(url, str) else None
            if not isinstance(title, str) or not parsed or parsed.scheme not in {"http", "https"} or not parsed.hostname:
                continue
            summary = item.get("snippet") or item.get("content") or ""
            results.append(NetworkSearchResult(title=title[:200], summary=str(summary)[:800], url=url, source_domain=parsed.hostname))
        return results[:limit]
