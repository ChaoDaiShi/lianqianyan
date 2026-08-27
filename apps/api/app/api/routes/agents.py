from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.agents.base import AgentRequest, AgentsChatResponse
from app.agents.orchestrator import EducationAgentOrchestrator
from app.db.session import get_db
from app.auth.dependencies import authorize_learning_scope, optional_current_account
from app.auth.models import AuthAccount

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/chat", response_model=AgentsChatResponse)
async def chat(
    payload: AgentRequest,
    db: Session = Depends(get_db),
    account: AuthAccount | None = Depends(optional_current_account),
) -> AgentsChatResponse:
    authorize_learning_scope(account, payload.learner_id, payload.course_id)
    return await EducationAgentOrchestrator(db).handle(payload)
