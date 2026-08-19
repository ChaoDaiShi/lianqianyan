from __future__ import annotations

from sqlalchemy.orm import Session

from app.agents.base import AgentCapability, AgentRequest, AgentResult
from app.services.study_plan_application_service import StudyPlanApplicationService


class PlannerAgent:
    """Read current plans; generate only for explicit user intent."""

    _generate_keywords = ("生成计划", "制定计划", "重新生成", "重新规划", "安排新的学习计划")

    def __init__(
        self,
        db: Session,
        application: StudyPlanApplicationService | None = None,
    ) -> None:
        self._application = application or StudyPlanApplicationService(db)

    @classmethod
    def should_generate(cls, message: str) -> bool:
        return any(keyword in message for keyword in cls._generate_keywords)

    def run(self, request: AgentRequest, diagnosis: AgentResult | None = None) -> AgentResult:
        plan = (
            self._application.generate_plan(request.learner_id, request.course_id)
            if self.should_generate(request.message)
            else self._application.get_current(request.learner_id, request.course_id)
        )
        if plan is None:
            return AgentResult(
                agent=AgentCapability.PLANNING,
                summary="目前还没有当前学习计划，请明确请求生成一份计划。",
                data={"plan": None},
                context_used=["diagnosis"] if diagnosis else [],
                suggested_actions=[{"type": "open_latest_plan", "label": "生成学习计划"}],
            )

        first = plan.tasks[0] if plan.tasks else None
        summary = (
            f"当前计划建议先学习「{first.knowledge_point_name}」约 {first.estimated_minutes} 分钟"
            if first is not None
            else "当前计划暂无任务"
        )
        return AgentResult(
            agent=AgentCapability.PLANNING,
            summary=summary,
            data={"plan": plan.model_dump(mode="json")},
            context_used=["study_plan"] + (["diagnosis"] if diagnosis else []),
            suggested_actions=[{"type": "open_latest_plan", "label": "查看今日计划"}],
        )
