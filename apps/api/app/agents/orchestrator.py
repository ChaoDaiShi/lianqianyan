from __future__ import annotations

from collections.abc import Iterable
from typing import Protocol

from app.agents.base import (
    AgentCapability,
    AgentRequest,
    AgentResult,
    AgentsChatResponse,
    AgentTraceItem,
)
from app.agents.diagnosis_agent import DiagnosisAgent
from app.agents.planner_agent import PlannerAgent
from app.agents.assessment_agent import AssessmentAgent
from app.agents.router import AgentRouter
from app.agents.tutor_agent import TutorAgent
from app.llm.provider import BaseLLMProvider
from app.knowledge import RetrievedKnowledge
from app.tools import EducationToolRegistry, build_tool_registry
from sqlalchemy.orm import Session


_LABELS = {
    AgentCapability.DIAGNOSIS: "学习诊断",
    AgentCapability.PLANNING: "学习规划",
    AgentCapability.TUTORING: "小涟辅导",
    AgentCapability.ASSESSMENT: "学习评估",
}


class ReadAgent(Protocol):
    def run(self, request: AgentRequest) -> AgentResult: ...


class EducationAgentOrchestrator:
    def __init__(self, db: Session, llm_provider: BaseLLMProvider | None = None) -> None:
        self._router = AgentRouter()
        self._tools: EducationToolRegistry = build_tool_registry(db)
        self._diagnosis = DiagnosisAgent(db, tools=self._tools)
        self._planner = PlannerAgent(db, tools=self._tools)
        self._tutor = TutorAgent(db, llm_provider=llm_provider)
        self._assessment = AssessmentAgent(db, tools=self._tools)

    async def handle(self, request: AgentRequest) -> AgentsChatResponse:
        decision = self._router.route(request.message, request.capability)
        trace: list[AgentTraceItem] = []
        results: list[AgentResult] = []

        if decision.collaborative:
            diagnosis = self._run_read_agent(self._diagnosis, request, trace)
            results.append(diagnosis)
            planner = self._planner.run(request, diagnosis=diagnosis)
            self._append_result_trace(planner, trace)
            results.append(planner)
            knowledge = self._retrieve(request, trace)
            tutor = await self._tutor.run(
                request,
                extra_context={"diagnosis": diagnosis.model_dump(), "planning": planner.model_dump()},
                knowledge=knowledge,
            )
            trace.append(self._trace(tutor))
            results.append(tutor)
        elif decision.capability == AgentCapability.DIAGNOSIS:
            results.append(self._run_read_agent(self._diagnosis, request, trace))
        elif decision.capability == AgentCapability.PLANNING:
            result = self._planner.run(request)
            self._append_result_trace(result, trace)
            results.append(result)
        elif decision.capability == AgentCapability.ASSESSMENT:
            assessment = self._assessment.run(request)
            self._append_result_trace(assessment, trace)
            results.append(assessment)
            evidence = assessment.data.get("evidence")
            if evidence is not None:
                knowledge_point_id = evidence.get("knowledge_point_id")
                knowledge = self._retrieve(
                    request,
                    trace,
                    knowledge_point_id=knowledge_point_id,
                )
                tutor = await self._tutor.run(
                    request,
                    knowledge=knowledge,
                    assessment=assessment.data,
                )
                trace.append(self._trace(tutor))
                results.append(tutor)
        else:
            knowledge = self._retrieve(request, trace)
            result = await self._tutor.run(request, knowledge=knowledge)
            trace.append(self._trace(result))
            results.append(result)

        final = results[-1]
        answer = final.summary
        if final.agent != AgentCapability.TUTORING and decision.capability != AgentCapability.TUTORING:
            answer = final.summary
        context_used = _unique(item for result in results for item in result.context_used)
        actions = _unique_actions(result.suggested_actions for result in results)
        tutor_result = next((result for result in reversed(results) if result.agent == AgentCapability.TUTORING), None)
        return AgentsChatResponse(
            answer=answer,
            selected_capability=decision.capability,
            provider=tutor_result.provider if tutor_result else "none",
            model=tutor_result.model if tutor_result else None,
            response_mode=tutor_result.response_mode if tutor_result else "provider",
            sources=tutor_result.sources if tutor_result else [],
            context_used=context_used,
            suggested_actions=actions,
            agent_trace=trace,
        )

    def _retrieve(
        self,
        request: AgentRequest,
        trace: list[AgentTraceItem],
        knowledge_point_id: str | None = None,
    ) -> list[RetrievedKnowledge]:
        tool_result = self._tools.execute(
            "search_course_knowledge",
            {
                "course_id": request.course_id,
                "query": request.message,
                "knowledge_point_id": knowledge_point_id or request.knowledge_point_id,
                "top_k": 4,
            },
        )
        trace.append(
            AgentTraceItem(
                agent="search_course_knowledge",
                name="search_course_knowledge",
                label="课程知识检索",
                type="tool",
                status="completed" if tool_result.success else "failed",
            )
        )
        if not tool_result.success or not isinstance(tool_result.data, list):
            return []
        return [RetrievedKnowledge.model_validate(item) for item in tool_result.data]

    @staticmethod
    def _trace(result: AgentResult) -> AgentTraceItem:
        return AgentTraceItem(
            agent=result.agent,
            label=_LABELS[result.agent],
            status="completed" if result.success else "failed",
        )

    @staticmethod
    def _append_result_trace(result: AgentResult, trace: list[AgentTraceItem]) -> None:
        trace.append(EducationAgentOrchestrator._trace(result))
        for item in result.tool_trace:
            trace.append(
                AgentTraceItem(
                    agent=item.name,
                    name=item.name,
                    label=item.name,
                    status=item.status,
                    type="tool",
                )
            )

    @staticmethod
    def _run_read_agent(agent: ReadAgent, request: AgentRequest, trace: list[AgentTraceItem]) -> AgentResult:
        result = agent.run(request)
        EducationAgentOrchestrator._append_result_trace(result, trace)
        return result


def _unique(items: Iterable[str]) -> list[str]:
    return list(dict.fromkeys(items))


def _unique_actions(groups):
    seen: set[tuple[str, str]] = set()
    output: list[dict[str, str]] = []
    for group in groups:
        for item in group:
            key = (item.get("type", ""), item.get("label", ""))
            if key not in seen:
                seen.add(key)
                output.append(item)
    return output[:5]
