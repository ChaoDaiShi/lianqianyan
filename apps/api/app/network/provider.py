from __future__ import annotations

from abc import ABC, abstractmethod

from app.network.models import NetworkSearchResult, SearchLanguage

UNAVAILABLE_MESSAGE = "AnySearch learning search is temporarily unavailable"


class NetworkSearchUnavailable(RuntimeError):
    """A sanitized failure at the external search boundary."""


class BaseNetworkSearchProvider(ABC):
    provider_name: str
    @abstractmethod
    async def search(
        self,
        query: str,
        limit: int,
        language: SearchLanguage,
    ) -> list[NetworkSearchResult]:
        raise NotImplementedError
