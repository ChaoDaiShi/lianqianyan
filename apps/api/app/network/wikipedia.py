from __future__ import annotations

import html
import re
from collections.abc import Mapping
from typing import Any
from urllib.parse import urlparse

import httpx

from app.network.models import NetworkSearchResult, SearchLanguage
from app.network.provider import (
    BaseNetworkSearchProvider,
    NetworkSearchUnavailable,
    UNAVAILABLE_MESSAGE,
)

_WIKIPEDIA_HOSTS: dict[SearchLanguage, str] = {
    "zh": "zh.wikipedia.org",
    "en": "en.wikipedia.org",
}
_USER_AGENT = "EducationMind/0.1 (local learning-search feature)"
_HTML_TAG = re.compile(r"<[^>]+>")
_WHITESPACE = re.compile(r"\s+")


def _plain_text(value: object, limit: int) -> str:
    if not isinstance(value, str):
        return ""
    without_tags = _HTML_TAG.sub(" ", html.unescape(value))
    return _WHITESPACE.sub(" ", without_tags).strip()[:limit].strip()


def _sort_index(page: Mapping[str, Any]) -> tuple[float, str]:
    raw_index = page.get("index")
    index = float(raw_index) if isinstance(raw_index, (int, float)) else float("inf")
    title = page.get("title")
    return index, title if isinstance(title, str) else ""


class WikipediaSearchProvider(BaseNetworkSearchProvider):
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def search(
        self,
        query: str,
        limit: int,
        language: SearchLanguage,
    ) -> list[NetworkSearchResult]:
        host = _WIKIPEDIA_HOSTS[language]
        params: dict[str, str | int] = {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrlimit": limit,
            "gsrnamespace": 0,
            "prop": "extracts|info",
            "inprop": "url",
            "exintro": 1,
            "explaintext": 1,
            "exchars": 420,
            "format": "json",
            "formatversion": 2,
            "utf8": 1,
        }
        headers = {"User-Agent": _USER_AGENT}

        try:
            if self._client is None:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(6.0),
                    follow_redirects=False,
                ) as client:
                    response = await client.get(
                        f"https://{host}/w/api.php",
                        params=params,
                        headers=headers,
                    )
            else:
                response = await self._client.get(
                    f"https://{host}/w/api.php",
                    params=params,
                    headers=headers,
                    timeout=httpx.Timeout(6.0),
                    follow_redirects=False,
                )
            response.raise_for_status()
            payload = response.json()
            pages = self._pages_from_payload(payload)
        except (httpx.HTTPError, TypeError, ValueError) as exc:
            raise NetworkSearchUnavailable(UNAVAILABLE_MESSAGE) from exc

        results: list[NetworkSearchResult] = []
        for page in sorted(pages, key=_sort_index):
            title = _plain_text(page.get("title"), 200)
            url = page.get("fullurl")
            if not title or not isinstance(url, str):
                continue
            parsed = urlparse(url)
            if parsed.scheme != "https" or parsed.hostname != host:
                continue
            results.append(
                NetworkSearchResult(
                    title=title,
                    summary=_plain_text(page.get("extract"), 420),
                    url=url,
                    source_domain=host,
                )
            )
        return results[:limit]

    @staticmethod
    def _pages_from_payload(payload: object) -> list[Mapping[str, Any]]:
        if not isinstance(payload, dict) or "error" in payload:
            raise ValueError("invalid MediaWiki response")
        query = payload.get("query", {})
        if not isinstance(query, dict):
            raise ValueError("invalid MediaWiki query response")
        pages = query.get("pages", [])
        if not isinstance(pages, list):
            raise ValueError("invalid MediaWiki pages response")
        return [page for page in pages if isinstance(page, dict)]
