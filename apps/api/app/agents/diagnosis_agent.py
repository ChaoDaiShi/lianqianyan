from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.agents.base import AgentCapability, AgentRequest, AgentResult, ToolTraceItem
from app.tools import EducationToolRegistry, build_tool_registry
from app.tools.profile_tools import LearnerCourseInput


class DiagnosisAgent:
    """Read-only capability boundary around the accepted diagnosis services."""

    def __init__(
        self,
        db: Session,
        tools: EducationToolRegistry | None = None,
    ) -> None:
        self._tools = tools or build_tool_registry(db)

    def run(self, request: AgentRequest) -> AgentResult:
        result = self._tools.execute(
            "get_learning_diagnosis",
            LearnerCourseInput(
                learner_id=request.learner_id,
                course_id=request.course_id,
            ).model_dump(),
        )
        if not result.success or not isinstance(result.data, dict):
            return AgentResult(
                agent=AgentCapability.DIAGNOSIS,
                success=False,
                summary=result.error.message if result.error else "无法读取学习诊断。",
                tool_trace=[ToolTraceItem(name="get_learning_diagnosis", status="failed")],
            )
        diagnosis = result.data
        primary = diagnosis.get("primary_focus")
        summary = (
            f"当前优先关注「{primary['knowledge_point_name']}」"
            if isinstance(primary, dict)
            else "目前还没有足够记录判断明确的优先知识点"
        )
        return AgentResult(
            agent=AgentCapability.DIAGNOSIS,
            summary=summary,
            data={"diagnosis": diagnosis},
            context_used=["diagnosis"],
            tool_trace=[ToolTraceItem(name="get_learning_diagnosis")],
            suggested_actions=(
                [{"type": "open_diagnosis", "label": "查看学习诊断"}]
                if primary is not None
                else []
            ),
        )
