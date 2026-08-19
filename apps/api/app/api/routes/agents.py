from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.agents.base import AgentRequest, AgentsChatResponse
from app.agents.orchestrator import EducationAgentOrchestrator
from app.db.session import get_db

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/chat", response_model=AgentsChatResponse)
async def chat(payload: AgentRequest, db: Session = Depends(get_db)) -> AgentsChatResponse:
    return await EducationAgentOrchestrator(db).handle(payload)
