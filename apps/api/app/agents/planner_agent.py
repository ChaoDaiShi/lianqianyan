from __future__ import annotations

from sqlalchemy.orm import Session

from app.agents.base import AgentCapability, AgentRequest, AgentResult, ToolTraceItem
from app.tools import EducationToolRegistry, build_tool_registry
from app.tools.profile_tools import LearnerCourseInput


class PlannerAgent:
    """Read current plans; generate only for explicit user intent."""

    _generate_keywords = ("生成计划", "制定计划", "重新生成", "重新规划", "安排新的学习计划")

    def __init__(
        self,
        db: Session,
        tools: EducationToolRegistry | None = None,
    ) -> None:
        self._tools = tools or build_tool_registry(db)

    @classmethod
    def should_generate(cls, message: str) -> bool:
        return any(keyword in message for keyword in cls._generate_keywords)

    def run(self, request: AgentRequest, diagnosis: AgentResult | None = None) -> AgentResult:
        tool_name = "generate_study_plan" if self.should_generate(request.message) else "get_current_study_plan"
        result = self._tools.execute(
            tool_name,
            LearnerCourseInput(
                learner_id=request.learner_id,
                course_id=request.course_id,
            ).model_dump(),
        )
        plan = result.data if result.success else None
        tool_trace = [ToolTraceItem(name=tool_name, status="completed" if result.success else "failed")]
        if not result.success:
            return AgentResult(
                agent=AgentCapability.PLANNING,
                success=False,
                summary=result.error.message if result.error else "无法读取学习计划。",
                tool_trace=tool_trace,
            )
        if plan is None:
            return AgentResult(
                agent=AgentCapability.PLANNING,
                summary="目前还没有当前学习计划，请明确请求生成一份计划。",
                data={"plan": None},
                context_used=["diagnosis"] if diagnosis else [],
                suggested_actions=[{"type": "open_latest_plan", "label": "生成学习计划"}],
                tool_trace=tool_trace,
            )

        first = plan.get("tasks", [])[0] if plan.get("tasks") else None
        summary = (
            f"当前计划建议先学习「{first['knowledge_point_name']}」约 {first['estimated_minutes']} 分钟"
            if first is not None
            else "当前计划暂无任务"
        )
        return AgentResult(
            agent=AgentCapability.PLANNING,
            summary=summary,
            data={"plan": plan},
            context_used=["study_plan"] + (["diagnosis"] if diagnosis else []),
            suggested_actions=[{"type": "open_latest_plan", "label": "查看今日计划"}],
            tool_trace=tool_trace,
        )
