from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.agents.base import AgentCapability, AgentRequest, AgentResult
from app.domain.tutor import TutorConversationRequest
from app.llm.provider import BaseLLMProvider
from app.knowledge import RetrievedKnowledge
from app.services.tutor_service import TutorService


class TutorAgent:
    """Final natural-language capability; delegates to exactly one TutorService call."""

    def __init__(self, db: Session, llm_provider: BaseLLMProvider | None = None) -> None:
        self._service = TutorService(db, llm_provider=llm_provider)

    async def run(
        self,
        request: AgentRequest,
        extra_context: dict[str, Any] | None = None,
        knowledge: list[RetrievedKnowledge] | None = None,
        assessment: dict[str, Any] | None = None,
    ) -> AgentResult:
        message = request.message
        if extra_context:
            notes = "\n".join(
                f"{key}: {value.get('summary', '')}"
                for key, value in extra_context.items()
                if isinstance(value, dict)
            )
            if notes:
                message = f"{request.message}\n\n协作诊断与计划摘要：\n{notes}"
        response = await self._service.chat(
            TutorConversationRequest(
                learner_id=request.learner_id,
                course_id=request.course_id,
                message=message,
            ),
            knowledge=knowledge,
            assessment=assessment,
        )
        return AgentResult(
            agent=AgentCapability.TUTORING,
            summary=response.answer,
            data={"answer": response.answer},
            suggested_actions=[
                {"type": "continue_learning", "label": action}
                for action in response.suggested_actions
            ],
            context_used=response.context_used,
            provider=response.provider,
            model=response.model,
            response_mode=response.response_mode,
            sources=response.sources,
        )
