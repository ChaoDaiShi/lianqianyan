"""健康检查路由。"""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings
from app.domain import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """服务健康检查。"""
    settings = get_settings()
    return HealthResponse(status="ok", service=settings.app_name)
