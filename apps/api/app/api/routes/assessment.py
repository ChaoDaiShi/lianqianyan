"""测评路由（阶段性骨架）。"""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings
from app.domain import MessageResponse

router = APIRouter(prefix="/assessment", tags=["assessment"])


@router.get("", response_model=MessageResponse)
def assessment_root() -> MessageResponse:
    settings = get_settings()
    return MessageResponse(message=f"{settings.app_name} · assessment module is ready")
