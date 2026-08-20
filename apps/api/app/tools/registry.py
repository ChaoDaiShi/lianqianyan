from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy.orm import Session

from app.tools.base import EducationTool, ToolDefinition, ToolError, ToolResult


class EducationToolRegistry:
    def __init__(self, tools: Iterable[EducationTool] = ()) -> None:
        self._tools: dict[str, EducationTool] = {}
        for tool in tools:
            self.register(tool)

    def register(self, tool: EducationTool) -> None:
        if tool.name in self._tools:
            raise ValueError(f"duplicate education tool name: {tool.name}")
        self._tools[tool.name] = tool

    def get(self, name: str) -> EducationTool | None:
        return self._tools.get(name)

    def list_tools(self) -> list[ToolDefinition]:
        return [tool.definition for tool in self._tools.values()]

    def execute(self, name: str, arguments: dict[str, object]) -> ToolResult:
        tool = self.get(name)
        if tool is None:
            return ToolResult(
                success=False,
                error=ToolError(
                    code="TOOL_NOT_FOUND",
                    message=f"Unknown education tool: {name}",
                ),
            )
        return tool.execute(arguments)


def build_tool_registry(db: Session) -> EducationToolRegistry:
    from app.tools.diagnosis_tools import GetLearningDiagnosisTool
    from app.tools.knowledge_tools import SearchCourseKnowledgeTool
    from app.tools.learning_tools import GetRecentLearningEvidenceTool
    from app.tools.planning_tools import (
        GenerateStudyPlanTool,
        GetCurrentStudyPlanTool,
        ReplanStudyPlanTool,
    )
    from app.tools.profile_tools import GetLearnerProfileTool

    return EducationToolRegistry(
        [
            GetLearnerProfileTool(db),
            GetLearningDiagnosisTool(db),
            GetCurrentStudyPlanTool(db),
            SearchCourseKnowledgeTool(),
            GetRecentLearningEvidenceTool(db),
            GenerateStudyPlanTool(db),
            ReplanStudyPlanTool(db),
        ]
    )
