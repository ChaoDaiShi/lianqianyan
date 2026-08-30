from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.agents.base import AgentRequest, AgentsChatResponse
from app.agents.orchestrator import EducationAgentOrchestrator
from app.db.session import get_db
from app.auth.dependencies import authorize_learning_scope, optional_current_account
from app.auth.models import AuthAccount
from app.core.config import get_settings
from app.preferences.providers import account_llm_provider
from app.companion.service import CompanionService, CompanionThreadNotFound
from fastapi import HTTPException

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/chat", response_model=AgentsChatResponse)
async def chat(
    payload: AgentRequest,
    db: Session = Depends(get_db),
    account: AuthAccount | None = Depends(optional_current_account),
) -> AgentsChatResponse:
    authorize_learning_scope(account, payload.learner_id, payload.course_id)
    memories: list[str] = []
    if payload.thread_id and account is not None:
        try:
            thread = CompanionService(db).get(account, payload.thread_id)
        except CompanionThreadNotFound as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        if thread.course_id != payload.course_id:
            raise HTTPException(status_code=403, detail="companion thread course scope denied")
        memories = [item.content for item in thread.memories]
    return await EducationAgentOrchestrator(
        db, llm_provider=account_llm_provider(db, get_settings(), account)
    ).handle(payload, memories=memories)
