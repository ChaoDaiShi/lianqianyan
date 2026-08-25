from __future__ import annotations

import asyncio

import httpx
import pytest

from app.network import (
    NetworkSearchRequest,
    NetworkSearchService,
    NetworkSearchUnavailable,
    WikipediaSearchProvider,
)


def run_search(
    handler,
    *,
    query: str = "银行家算法",
    limit: int = 2,
    language: str = "zh",
):
    async def scenario():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            provider = WikipediaSearchProvider(client=client)
            return await provider.search(query, limit, language)

    return asyncio.run(scenario())


def test_wikipedia_provider_uses_fixed_mediawiki_contract_and_maps_plain_text() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "zh.wikipedia.org"
        assert request.url.path == "/w/api.php"
        assert request.url.params["action"] == "query"
        assert request.url.params["generator"] == "search"
        assert request.url.params["gsrsearch"] == "银行家算法"
        assert request.url.params["gsrlimit"] == "2"
        assert request.url.params["gsrnamespace"] == "0"
        assert request.url.params["prop"] == "extracts|info"
        assert request.url.params["explaintext"] == "1"
        assert request.url.params["formatversion"] == "2"
        assert request.headers["user-agent"].startswith("EducationMind/")
        assert "learning-search" in request.headers["user-agent"]
        return httpx.Response(
            200,
            json={
                "query": {
                    "pages": [
                        {
                            "pageid": 10,
                            "ns": 0,
                            "title": "银行家算法",
                            "index": 1,
                            "extract": "  <span>银行家算法</span> 是一种   死锁避免算法。 ",
                            "fullurl": "https://zh.wikipedia.org/wiki/%E9%93%B6%E8%A1%8C%E5%AE%B6%E7%AE%97%E6%B3%95",
                        }
                    ]
                }
            },
        )

    results = run_search(handler)

    assert len(results) == 1
    assert results[0].title == "银行家算法"
    assert results[0].summary == "银行家算法 是一种 死锁避免算法。"
    assert results[0].source_domain == "zh.wikipedia.org"
    assert results[0].url.startswith("https://zh.wikipedia.org/wiki/")


def test_wikipedia_provider_selects_english_host_and_stable_upstream_order() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "en.wikipedia.org"
        return httpx.Response(
            200,
            json={
                "query": {
                    "pages": [
                        {
                            "title": "Second",
                            "index": 2,
                            "extract": "second",
                            "fullurl": "https://en.wikipedia.org/wiki/Second",
                        },
                        {
                            "title": "First",
                            "index": 1,
                            "extract": "first",
                            "fullurl": "https://en.wikipedia.org/wiki/First",
                        },
                    ]
                }
            },
        )

    results = run_search(handler, query="deadlock", language="en")

    assert [item.title for item in results] == ["First", "Second"]


def test_wikipedia_provider_returns_empty_and_ignores_unsafe_or_incomplete_pages() -> None:
    empty = run_search(lambda request: httpx.Response(200, json={"query": {"pages": []}}))
    assert empty == []

    unsafe = run_search(
        lambda request: httpx.Response(
            200,
            json={
                "query": {
                    "pages": [
                        {"title": "Missing URL", "extract": "ignored"},
                        {
                            "title": "Wrong host",
                            "extract": "ignored",
                            "fullurl": "https://example.test/page",
                        },
                        {
                            "extract": "missing title",
                            "fullurl": "https://zh.wikipedia.org/wiki/Missing",
                        },
                    ]
                }
            },
        )
    )
    assert unsafe == []


@pytest.mark.parametrize("status", [403, 429, 500])
def test_wikipedia_provider_sanitizes_upstream_http_errors(status: int) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status, text="secret upstream response body")

    with pytest.raises(NetworkSearchUnavailable) as exc_info:
        run_search(handler)

    assert str(exc_info.value) == "Wikipedia learning search is temporarily unavailable"
    assert "secret" not in str(exc_info.value)
    assert str(status) not in str(exc_info.value)


def test_wikipedia_provider_sanitizes_timeout_and_malformed_protocol() -> None:
    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("private upstream detail", request=request)

    with pytest.raises(NetworkSearchUnavailable):
        run_search(timeout)

    with pytest.raises(NetworkSearchUnavailable):
        run_search(lambda request: httpx.Response(200, content=b"not-json"))

    with pytest.raises(NetworkSearchUnavailable):
        run_search(
            lambda request: httpx.Response(
                200,
                json={"query": {"pages": {"unexpected": "object"}}},
            )
        )


def test_network_search_service_preserves_provider_and_normalized_query() -> None:
    class FakeProvider:
        async def search(self, query: str, limit: int, language: str):
            assert (query, limit, language) == ("死锁", 3, "zh")
            return []

    request = NetworkSearchRequest(query="  死锁  ", limit=3, language="zh")
    response = asyncio.run(NetworkSearchService(FakeProvider()).search(request))

    assert response.provider == "wikipedia"
    assert response.query == "死锁"
    assert response.results == []
