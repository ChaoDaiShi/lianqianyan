"""练习路由 —— 提供练习评价（掌握度投影）能力。"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.auth.dependencies import authorize_learning_scope, optional_current_account
from app.auth.models import AuthAccount
from app.db.session import get_db
from app.domain import MessageResponse, PracticeEvaluateRequest, PracticeEvaluateResponse
from app.services import PracticeEvaluationService

router = APIRouter(prefix="/practice", tags=["practice"])


def _service(db: Session = Depends(get_db)) -> PracticeEvaluationService:
    return PracticeEvaluationService(db)


@router.get("", response_model=MessageResponse)
def practice_root() -> MessageResponse:
    settings = get_settings()
    return MessageResponse(message=f"{settings.app_name} · practice module is ready")


@router.post("/evaluate", response_model=PracticeEvaluateResponse)
def evaluate_practice(
    payload: PracticeEvaluateRequest,
    service: PracticeEvaluationService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> PracticeEvaluateResponse:
    """评价一道练习。

    客户端只提供真实评价结果（is_correct / score / difficulty），
    mastery_before / mastery_after / confidence / evidence_count 全部由服务端计算。
    """
    authorize_learning_scope(account, payload.learner_id, payload.course_id)
    return service.evaluate(payload)
