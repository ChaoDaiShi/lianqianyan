"""DiagnosisService —— 学习诊断服务（决策/解释层，结构化输出，不依赖 LLM）。

职责：
    LearnerProfile / 诊断列表
        → 计算 priority_score
        → 排序
        → 确定 primary_focus / priority_interventions / strengths 等
        → 生成结构化 DiagnosisResult

primary_focus 必须来自「最高可信 priority_score」的合格知识点（不会是 UNASSESSED）。
不依赖 FastAPI；可供 Route / Diagnosis Agent / 未来 MCP Tool 复用。
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.domain import (
    DiagnosisReasonCode,
    DiagnosisResultOut,
    DiagnosisStatus,
    LearnerProfileOut,
)
from app.domain.models import KnowledgePointDiagnosis
from app.services.learner_profile_service import LearnerProfileService
from app.services.priority_policy import PriorityPolicy


class DiagnosisService:
    """基于学习画像生成结构化诊断。"""

    def __init__(
        self,
        db: Session,
        profile_service: LearnerProfileService | None = None,
    ) -> None:
        self._db = db
        self._profile_service = profile_service or LearnerProfileService(db)
        self._priority = PriorityPolicy()

    def diagnose_learner_course(
        self, learner_id: str, course_id: str, course_name: str
    ) -> DiagnosisResultOut:
        """生成某学生某课程的结构化诊断。"""
        profile = self._profile_service.build_profile(learner_id, course_id, course_name)
        return self.build_from_profile(profile)

    def build_from_profile(self, profile: LearnerProfileOut) -> DiagnosisResultOut:
        """从 LearnerProfile 构建 DiagnosisResult。"""
        points = list(profile.knowledge_points)

        # 计算 priority_score（仅合格知识点）
        for p in points:
            if self._priority.is_priority_eligible(p.status):
                p.priority_score = self._priority.compute(p.mastery_score, p.confidence)
            else:
                p.priority_score = 0.0

        weak_points = [p for p in points if p.status == DiagnosisStatus.WEAK]
        developing = [p for p in points if p.status == DiagnosisStatus.DEVELOPING]
        strengths = [
            p for p in points if p.status in (DiagnosisStatus.PROFICIENT, DiagnosisStatus.MASTERED)
        ]
        unassessed = [
            p
            for p in points
            if p.status in (DiagnosisStatus.UNASSESSED, DiagnosisStatus.INSUFFICIENT_EVIDENCE)
        ]

        # primary_focus：最高 priority_score 的合格知识点
        eligible = [p for p in points if self._priority.is_priority_eligible(p.status)]
        primary_focus: KnowledgePointDiagnosis | None = None
        if eligible:
            primary_focus = max(eligible, key=lambda p: p.priority_score)
            if primary_focus.priority_score <= 0.0:
                primary_focus = None

        # priority_interventions：按 priority_score 降序的合格虚弱点
        interventions = sorted(
            [p for p in points if self._priority.is_priority_eligible(p.status) and p.priority_score > 0],
            key=lambda p: p.priority_score,
            reverse=True,
        )

        summary_codes: list[DiagnosisReasonCode] = []
        if unassessed:
            summary_codes.append(DiagnosisReasonCode.NO_EVIDENCE)
        if weak_points:
            summary_codes.append(DiagnosisReasonCode.LOW_MASTERY)
        if strengths:
            summary_codes.append(DiagnosisReasonCode.STRONG_MASTERY)

        return DiagnosisResultOut(
            learner_id=profile.learner_id,
            course_id=profile.course_id,
            course_name=profile.course_name,
            primary_focus=primary_focus,
            priority_interventions=interventions,
            strengths=strengths,
            weak_points=weak_points,
            developing_points=developing,
            unassessed_points=unassessed,
            summary_codes=list(dict.fromkeys(summary_codes)),
            diagnosis_generated_at=datetime.utcnow(),
        )
