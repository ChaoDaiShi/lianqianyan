from __future__ import annotations

from app.network.models import NetworkSearchRequest, NetworkSearchResponse
from app.network.provider import BaseNetworkSearchProvider
from app.network.wikipedia import WikipediaSearchProvider


class NetworkSearchService:
    def __init__(self, provider: BaseNetworkSearchProvider | None = None) -> None:
        self._provider = provider or WikipediaSearchProvider()

    async def search(self, request: NetworkSearchRequest) -> NetworkSearchResponse:
        results = await self._provider.search(
            request.query,
            request.limit,
            request.language,
        )
        return NetworkSearchResponse(query=request.query, results=results)
