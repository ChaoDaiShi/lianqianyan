from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.adaptive.service import AdaptiveLearningService
from app.auth.dependencies import authorize_learning_scope, optional_current_account
from app.auth.models import AuthAccount
from app.db.session import get_db

router = APIRouter(prefix="/adaptive", tags=["adaptive-learning"])


class SessionCreateBody(BaseModel):
    learnerId: str
    courseId: str
    topicId: str
    policy: Literal["leap", "fixed"]
    experimentGroup: Literal["A", "B", "C", "D"]
    ablation: Literal["none", "misconception", "prerequisites", "ranking"] = "none"
    timeBudgetMinutes: int = Field(default=25, ge=3, le=180)
    fromSessionId: str | None = None


class AnswerBody(BaseModel):
    answer: str
    optionId: str | None = None
    durationSeconds: int = Field(ge=0)


class PracticeBody(AnswerBody):
    hintUsed: bool


def _service(db: Session = Depends(get_db)) -> AdaptiveLearningService:
    return AdaptiveLearningService(db)


def _scope_session(
    service: AdaptiveLearningService,
    session_id: str,
    account: AuthAccount | None,
) -> dict:
    scope = service.session_scope(session_id, account.id if account is not None else None)
    authorize_learning_scope(account, scope["learnerId"], scope["courseId"])
    return scope


@router.get("/catalog")
def catalog() -> dict:
    return AdaptiveLearningService.get_catalog()


@router.get("/sessions")
def list_sessions(
    learner_id: str,
    course_id: str = "course-ds",
    service: AdaptiveLearningService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> list[dict]:
    authorize_learning_scope(account, learner_id, course_id)
    return service.list_sessions(learner_id, course_id)


@router.post("/sessions", status_code=201)
def create_session(
    payload: SessionCreateBody,
    service: AdaptiveLearningService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> dict:
    authorize_learning_scope(account, payload.learnerId, payload.courseId)
    return service.create_session(
        learner_id=payload.learnerId,
        course_id=payload.courseId,
        topic_id=payload.topicId,
        policy=payload.policy,
        experiment_group=payload.experimentGroup,
        ablation=payload.ablation,
        time_budget_minutes=payload.timeBudgetMinutes,
        from_session_id=payload.fromSessionId,
    )


@router.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    service: AdaptiveLearningService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> dict:
    scope = _scope_session(service, session_id, account)
    return service.get_session(session_id, scope["learnerId"], scope["courseId"])


@router.post("/sessions/{session_id}/diagnose")
def diagnose(
    session_id: str,
    payload: AnswerBody,
    service: AdaptiveLearningService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> dict:
    scope = _scope_session(service, session_id, account)
    return service.diagnose(
        session_id,
        scope["learnerId"],
        payload.answer,
        payload.optionId,
        payload.durationSeconds,
    )


@router.post("/sessions/{session_id}/intervene")
def intervene(
    session_id: str,
    payload: dict,
    service: AdaptiveLearningService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> dict:
    scope = _scope_session(service, session_id, account)
    return service.intervene(session_id, scope["learnerId"], payload.get("actionType"))


@router.post("/sessions/{session_id}/practice")
def practice(
    session_id: str,
    payload: PracticeBody,
    service: AdaptiveLearningService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> dict:
    scope = _scope_session(service, session_id, account)
    return service.practice(
        session_id,
        scope["learnerId"],
        payload.answer,
        payload.optionId,
        payload.durationSeconds,
        payload.hintUsed,
    )


@router.post("/sessions/{session_id}/ready-probe")
def ready_probe(
    session_id: str,
    service: AdaptiveLearningService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> dict:
    scope = _scope_session(service, session_id, account)
    return service.ready_probe(session_id, scope["learnerId"])


@router.post("/sessions/{session_id}/probe")
def probe(
    session_id: str,
    payload: AnswerBody,
    service: AdaptiveLearningService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> dict:
    scope = _scope_session(service, session_id, account)
    return service.probe(
        session_id,
        scope["learnerId"],
        payload.answer,
        payload.optionId,
        payload.durationSeconds,
    )


@router.post("/sessions/{session_id}/retest")
def retest(
    session_id: str,
    payload: AnswerBody,
    service: AdaptiveLearningService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> dict:
    scope = _scope_session(service, session_id, account)
    return service.retest(
        session_id,
        scope["learnerId"],
        payload.answer,
        payload.optionId,
        payload.durationSeconds,
    )


@router.get("/overview")
def overview(
    learner_id: str,
    course_id: str = "course-ds",
    service: AdaptiveLearningService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> dict:
    authorize_learning_scope(account, learner_id, course_id)
    return service.overview(learner_id, course_id)


@router.get("/experiments/export")
def export_experiments(
    learner_id: str,
    course_id: str = "course-ds",
    service: AdaptiveLearningService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> dict:
    authorize_learning_scope(account, learner_id, course_id)
    return service.export_experiments(learner_id, course_id)
