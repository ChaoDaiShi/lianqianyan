"""学习报告路由（阶段性骨架）。"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth.dependencies import authorize_learning_scope, optional_current_account
from app.auth.models import AuthAccount

from app.core.config import get_settings
from app.domain import MessageResponse

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=MessageResponse)
def reports_root() -> MessageResponse:
    settings = get_settings()
    return MessageResponse(message=f"{settings.app_name} · reports module is ready")


@router.get("/latest/{user_id}", response_model=MessageResponse)
def latest_report(
    user_id: str,
    account: AuthAccount | None = Depends(optional_current_account),
) -> MessageResponse:
    """获取最新学习报告（第一阶段返回占位）。"""
    authorize_learning_scope(account, user_id)
    return MessageResponse(message=f"Latest LearningReport for user {user_id} (第一阶段占位)")
