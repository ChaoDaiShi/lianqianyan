from __future__ import annotations

from dataclasses import dataclass

from app.agents.base import AgentCapability


@dataclass(frozen=True)
class RouteDecision:
    capability: AgentCapability
    collaborative: bool = False


class AgentRouter:
    """Deterministic capability router; LLM is never used for routing."""

    _diagnosis_keywords = ("掌握", "薄弱", "学得怎么样", "哪里不会", "水平")
    _planning_keywords = ("今天学什么", "计划", "路线", "下一步", "安排")
    _assessment_keywords = ("为什么这题错了", "这次练习怎么样", "分析我的答案", "分析一下我刚才的练习")

    def route(
        self,
        message: str,
        capability: AgentCapability | None,
    ) -> RouteDecision:
        if capability is not None:
            return RouteDecision(capability=capability)

        text = message.strip()
        if self._is_collaborative_priority_question(text):
            return RouteDecision(AgentCapability.PLANNING, collaborative=True)
        if any(keyword in text for keyword in self._diagnosis_keywords):
            return RouteDecision(AgentCapability.DIAGNOSIS)
        if any(keyword in text for keyword in self._assessment_keywords):
            return RouteDecision(AgentCapability.ASSESSMENT)
        if any(keyword in text for keyword in self._planning_keywords):
            return RouteDecision(AgentCapability.PLANNING)
        return RouteDecision(AgentCapability.TUTORING)

    @staticmethod
    def _is_collaborative_priority_question(message: str) -> bool:
        return "最应该学什么" in message and ("为什么" in message or "原因" in message)
