"""练习路由 —— 提供练习评价（掌握度投影）能力。"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.auth.dependencies import authorize_learning_scope, optional_current_account
from app.auth.models import AuthAccount
from app.db.session import get_db
from app.domain import MessageResponse
from app.domain.models import (
    PracticeQuestionCatalogOut,
    PracticeSubmissionRequest,
    PracticeSubmissionResponse,
)
from app.services import PracticeEvaluationService

router = APIRouter(prefix="/practice", tags=["practice"])


def _service(db: Session = Depends(get_db)) -> PracticeEvaluationService:
    return PracticeEvaluationService(db)


@router.get("", response_model=MessageResponse)
def practice_root() -> MessageResponse:
    settings = get_settings()
    return MessageResponse(message=f"{settings.app_name} · practice module is ready")


@router.get("/questions", response_model=PracticeQuestionCatalogOut)
def list_practice_questions(
    learner_id: str,
    course_id: str,
    knowledge_point_id: str,
    service: PracticeEvaluationService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> PracticeQuestionCatalogOut:
    authorize_learning_scope(account, learner_id, course_id)
    return service.list_practice_questions(learner_id, course_id, knowledge_point_id)


@router.post("/evaluate", response_model=PracticeSubmissionResponse)
def evaluate_practice(
    payload: PracticeSubmissionRequest,
    service: PracticeEvaluationService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> PracticeSubmissionResponse:
    authorize_learning_scope(account, payload.learner_id, payload.course_id)
    return service.evaluate_catalog_question(payload)
