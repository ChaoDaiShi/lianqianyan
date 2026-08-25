from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.network import (
    NetworkSearchRequest,
    NetworkSearchResponse,
    NetworkSearchService,
    NetworkSearchUnavailable,
    UNAVAILABLE_MESSAGE,
)

router = APIRouter(prefix="/network", tags=["network-learning-search"])


def get_network_search_service() -> NetworkSearchService:
    return NetworkSearchService()


@router.post("/search", response_model=NetworkSearchResponse)
async def search_network(
    payload: NetworkSearchRequest,
    service: NetworkSearchService = Depends(get_network_search_service),
) -> NetworkSearchResponse:
    try:
        return await service.search(payload)
    except NetworkSearchUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=UNAVAILABLE_MESSAGE,
        ) from exc
