from __future__ import annotations

from typing import ClassVar

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.adaptive.service import AdaptiveLearningService
from app.tools.base import EducationTool


class AdaptiveLearningContextInput(BaseModel):
    learner_id: str = Field(min_length=1)
    course_id: str = Field(min_length=1)


class GetAdaptiveLearningContextTool(EducationTool[AdaptiveLearningContextInput]):
    """Read existing LEAP sessions and evidence for grounded tutor context."""

    name: ClassVar[str] = "get_adaptive_learning_context"
    description: ClassVar[str] = "读取学习者在当前课程中的 LEAP 会话、知识状态与已有证据"
    capability: ClassVar[str] = "tutoring"
    read_only: ClassVar[bool] = True
    input_model: ClassVar[type[AdaptiveLearningContextInput]] = AdaptiveLearningContextInput

    def __init__(self, db: Session) -> None:
        self._service = AdaptiveLearningService(db)

    def invoke(self, arguments: AdaptiveLearningContextInput) -> object:
        overview = self._service.overview(arguments.learner_id, arguments.course_id)
        sessions = overview.get("sessions", [])
        states = overview.get("states", [])
        latest = max(
            sessions,
            key=lambda session: str(session.get("updatedAt", "")),
            default=None,
        )

        if not sessions and not states:
            summary = "当前课程还没有 LEAP 会话或自适应学习证据。"
        else:
            summary_parts = [f"LEAP 会话 {len(sessions)} 次，知识状态 {len(states)} 项。"]
            for state in states:
                mastery = state.get("mastery")
                mastery_text = (
                    f"{round(float(mastery) * 100)}%" if mastery is not None else "尚无估计"
                )
                uncertainty = state.get("uncertainty")
                uncertainty_text = (
                    f"{round(float(uncertainty) * 100)}%"
                    if uncertainty is not None
                    else "未提供"
                )
                evidence_count = state.get("evidenceCount", 0)
                misconceptions = state.get("misconceptions", [])
                misconception_text = "、".join(
                    f"{item.get('code', '未知候选')} {round(float(item.get('probability', 0)) * 100)}%"
                    for item in misconceptions
                    if isinstance(item, dict)
                ) or "无误解候选"
                summary_parts.append(
                    f"知识点「{state.get('name', state.get('knowledgePointId', '未知'))}」："
                    f"M {mastery_text}，U {uncertainty_text}，Q 误解候选分布：{misconception_text}；"
                    f"有效证据数 {evidence_count} 条。"
                )
            if latest is not None:
                summary_parts.append(
                    f"最近会话主题「{latest.get('topicName', latest.get('topicId', '未知主题'))}」，阶段 {latest.get('phase', '未知')}。"
                )
                diagnosis = latest.get("diagnosis")
                if isinstance(diagnosis, dict):
                    summary_parts.append(
                        f"已有诊断：{diagnosis.get('title', '未命名')}；依据：{diagnosis.get('reason', '未提供')}。"
                    )
                decision = latest.get("decision")
                if isinstance(decision, dict):
                    summary_parts.append(
                        f"已有教学决策：{decision.get('label', decision.get('actionType', '未命名'))}；依据：{decision.get('reason', '未提供')}。"
                    )
                outcome = latest.get("outcome")
                if isinstance(outcome, dict):
                    summary_parts.append(
                        "已有后测结果："
                        f"{'独立作答' if outcome.get('independent') else '非独立作答'}，"
                        f"得分 {outcome.get('score', '未评分')}，"
                        f"误解状态 {outcome.get('misconceptionStatus', '未提供')}。"
                    )
            summary = " ".join(summary_parts)

        return {
            "learnerId": arguments.learner_id,
            "courseId": arguments.course_id,
            "catalogVersion": overview.get("catalogVersion"),
            "policyVersion": overview.get("policyVersion"),
            "stats": overview.get("stats", {}),
            "latestSession": latest,
            "knowledgeStates": states,
            "limitations": overview.get("limitations", []),
            "hasLearningEvidence": bool(sessions or states),
            "summary": summary,
        }
