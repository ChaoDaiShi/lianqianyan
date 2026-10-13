from __future__ import annotations

from collections.abc import Iterable
from typing import Protocol

from app.agents.base import (
    AgentCapability,
    AgentEventSink,
    AgentRequest,
    AgentResult,
    AgentStreamEvent,
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

    async def handle(
        self,
        request: AgentRequest,
        *,
        memories: list[str] | None = None,
        event_sink: AgentEventSink | None = None,
    ) -> AgentsChatResponse:
        decision = self._router.route(request.message, request.capability)
        self._emit_status(
            event_sink,
            "route",
            "正在识别需要协作的学习能力"
            if decision.collaborative
            else f"正在进入{_LABELS[decision.capability]}",
        )
        memory_context = (
            {"long_term_memory": {"summary": "；".join(memories[:20])}}
            if memories
            else {}
        )
        trace: list[AgentTraceItem] = []
        results: list[AgentResult] = []
        adaptive_context: dict[str, dict[str, str]] = {}
        adaptive_context_has_evidence = False

        if decision.collaborative:
            self._emit_status(event_sink, "diagnosis", "正在读取真实学习诊断")
            diagnosis = self._run_read_agent(
                self._diagnosis,
                request,
                trace,
                event_sink,
            )
            results.append(diagnosis)
            self._emit_status(event_sink, "planning", "正在核对当前学习计划")
            planner = self._planner.run(request, diagnosis=diagnosis)
            self._append_result_trace(planner, trace, event_sink)
            results.append(planner)
            knowledge = self._retrieve(request, trace, event_sink=event_sink)
            adaptive_context, adaptive_context_has_evidence = self._read_adaptive_context(
                request, trace, event_sink
            )
            self._emit_status(event_sink, "tutoring", "正在结合证据与课程知识组织回答")
            tutor = await self._tutor.run(
                request,
                extra_context={"diagnosis": diagnosis.model_dump(), "planning": planner.model_dump(), **memory_context, **adaptive_context},
                knowledge=knowledge,
            )
            self._append_trace(self._trace(tutor), trace, event_sink)
            results.append(tutor)
        elif decision.capability == AgentCapability.DIAGNOSIS:
            self._emit_status(event_sink, "diagnosis", "正在读取真实学习诊断")
            results.append(
                self._run_read_agent(
                    self._diagnosis,
                    request,
                    trace,
                    event_sink,
                )
            )
        elif decision.capability == AgentCapability.PLANNING:
            self._emit_status(event_sink, "planning", "正在核对当前学习计划")
            result = self._planner.run(request)
            self._append_result_trace(result, trace, event_sink)
            results.append(result)
        elif decision.capability == AgentCapability.ASSESSMENT:
            self._emit_status(event_sink, "assessment", "正在读取最近学习证据")
            assessment = self._assessment.run(request)
            self._append_result_trace(assessment, trace, event_sink)
            results.append(assessment)
            evidence = assessment.data.get("evidence")
            if evidence is not None:
                knowledge_point_id = evidence.get("knowledge_point_id")
                knowledge = self._retrieve(
                    request,
                    trace,
                    knowledge_point_id=knowledge_point_id,
                    event_sink=event_sink,
                )
                self._emit_status(
                    event_sink,
                    "tutoring",
                    "正在结合练习证据与课程知识解释结果",
                )
                adaptive_context, adaptive_context_has_evidence = self._read_adaptive_context(
                    request, trace, event_sink
                )
                tutor = await self._tutor.run(
                    request,
                    knowledge=knowledge,
                    assessment=assessment.data,
                    extra_context={**memory_context, **adaptive_context},
                )
                self._append_trace(self._trace(tutor), trace, event_sink)
                results.append(tutor)
        else:
            knowledge = self._retrieve(request, trace, event_sink=event_sink)
            adaptive_context, adaptive_context_has_evidence = self._read_adaptive_context(
                request, trace, event_sink
            )
            self._emit_status(event_sink, "tutoring", "正在结合课程知识组织回答")
            result = await self._tutor.run(
                request,
                knowledge=knowledge,
                extra_context={**memory_context, **adaptive_context},
            )
            self._append_trace(self._trace(result), trace, event_sink)
            results.append(result)

        final = results[-1]
        answer = final.summary
        if final.agent != AgentCapability.TUTORING and decision.capability != AgentCapability.TUTORING:
            answer = final.summary
        context_used = _unique(item for result in results for item in result.context_used)
        if memories:
            context_used = _unique([*context_used, "long_term_memory"])
        if adaptive_context_has_evidence:
            context_used = _unique([*context_used, "adaptive_learning"])
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
        event_sink: AgentEventSink | None = None,
    ) -> list[RetrievedKnowledge]:
        self._emit_status(event_sink, "knowledge", "正在检索当前课程的知识依据")
        tool_result = self._tools.execute(
            "search_course_knowledge",
            {
                "course_id": request.course_id,
                "query": request.message,
                "knowledge_point_id": knowledge_point_id or request.knowledge_point_id,
                "top_k": 4,
            },
        )
        self._append_trace(
            AgentTraceItem(
                agent="search_course_knowledge",
                name="search_course_knowledge",
                label="课程知识检索",
                type="tool",
                status="completed" if tool_result.success else "failed",
            ),
            trace,
            event_sink,
        )
        if not tool_result.success or not isinstance(tool_result.data, list):
            return []
        return [RetrievedKnowledge.model_validate(item) for item in tool_result.data]

    def _read_adaptive_context(
        self,
        request: AgentRequest,
        trace: list[AgentTraceItem],
        event_sink: AgentEventSink | None = None,
    ) -> tuple[dict[str, dict[str, str]], bool]:
        if request.course_id != "course-ds":
            return {}, False
        self._emit_status(event_sink, "adaptive", "正在读取现有 LEAP 学习记录")
        result = self._tools.execute(
            "get_adaptive_learning_context",
            {"learner_id": request.learner_id, "course_id": request.course_id},
        )
        self._append_trace(
            AgentTraceItem(
                agent="get_adaptive_learning_context",
                name="get_adaptive_learning_context",
                label="LEAP 学习上下文",
                type="tool",
                status="completed" if result.success else "failed",
            ),
            trace,
            event_sink,
        )
        if not result.success or not isinstance(result.data, dict):
            return {}, False
        summary = result.data.get("summary")
        if not isinstance(summary, str) or not summary:
            return {}, False
        has_evidence = result.data.get("hasLearningEvidence") is True
        return {"adaptive_learning": {"summary": summary}}, has_evidence

    @staticmethod
    def _trace(result: AgentResult) -> AgentTraceItem:
        return AgentTraceItem(
            agent=result.agent,
            label=_LABELS[result.agent],
            status="completed" if result.success else "failed",
        )

    @staticmethod
    def _append_result_trace(
        result: AgentResult,
        trace: list[AgentTraceItem],
        event_sink: AgentEventSink | None = None,
    ) -> None:
        EducationAgentOrchestrator._append_trace(
            EducationAgentOrchestrator._trace(result),
            trace,
            event_sink,
        )
        for item in result.tool_trace:
            EducationAgentOrchestrator._append_trace(
                AgentTraceItem(
                    agent=item.name,
                    name=item.name,
                    label=item.name,
                    status=item.status,
                    type="tool",
                ),
                trace,
                event_sink,
            )

    @staticmethod
    def _run_read_agent(
        agent: ReadAgent,
        request: AgentRequest,
        trace: list[AgentTraceItem],
        event_sink: AgentEventSink | None = None,
    ) -> AgentResult:
        result = agent.run(request)
        EducationAgentOrchestrator._append_result_trace(
            result,
            trace,
            event_sink,
        )
        return result

    @staticmethod
    def _append_trace(
        item: AgentTraceItem,
        trace: list[AgentTraceItem],
        event_sink: AgentEventSink | None,
    ) -> None:
        trace.append(item)
        if event_sink is not None:
            event_sink(
                AgentStreamEvent(
                    kind="trace",
                    stage="execution",
                    label=item.label,
                    item=item,
                )
            )

    @staticmethod
    def _emit_status(
        event_sink: AgentEventSink | None,
        stage: str,
        label: str,
    ) -> None:
        if event_sink is not None:
            event_sink(
                AgentStreamEvent(
                    kind="status",
                    stage=stage,
                    label=label,
                )
            )


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
