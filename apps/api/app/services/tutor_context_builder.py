"""TutorContextBuilder —— 学生学习上下文构建器（Phase 3-0 核心模块）。

职责：为一次提问构建 `TutorContext` 快照，供 Prompt / LLM 消费。

输入：learner_id + course_id
输出：TutorContext（profile / diagnosis / plan / recent_evidence + context_used）

数据来源（**全部复用既有服务，禁止重复计算**）：
- Learner Profile → `LearnerProfileService.build_profile`（Derived Read Model，只构建一次）
- Diagnosis     → `DiagnosisService.build_from_profile`（复用同一 Profile，不自行判断 weak / priority）
- Study Plan    → `StudyPlanRepository.list_by_learner_and_course` 取
                  `generated_at DESC` 第一条（**没有 current plan lifecycle**，
                  本轮不做 Active 唯一语义）+ `StudyTaskRepository.list_by_plan_id`
- Recent Evidence → `LearningEvidenceRepository.list_recent_by_learner`（最近 N 条）

约束：
- 不自己计算 mastery / 不自己判断 weak / 不自己生成 priority；
  保持 Mastery → Diagnosis → Tutor 单向链路。
- 纯读取，无副作用，不写 DB。
- 不依赖 FastAPI。
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain import Course
from app.domain.models import LearnerProfileOut
from app.domain.tutor import (
    TutorContext,
    TutorDiagnosisContext,
    TutorDiagnosisPointContext,
    TutorEvidenceContext,
    TutorPlanContext,
    TutorPlanTaskContext,
    TutorProfileContext,
    TutorProfilePointContext,
)
from app.services.diagnosis_service import DiagnosisService
from app.services.learner_profile_service import LearnerProfileService
from app.services.learning_evidence import LearningEvidenceRepository
from app.services.study_plan_repository import StudyPlanRepository
from app.services.study_task_repository import StudyTaskRepository

# 单次提问最多携带的最近学习证据条数（演示所需最小上下文，避免大段历史）。
RECENT_EVIDENCE_LIMIT = 5


class TutorContextBuilder:
    """依据真实学习状态构建请求级学习上下文。"""

    def __init__(
        self,
        db: Session,
        profile_service: LearnerProfileService | None = None,
        diagnosis_service: DiagnosisService | None = None,
        plan_repo: StudyPlanRepository | None = None,
        task_repo: StudyTaskRepository | None = None,
        evidence_repo: LearningEvidenceRepository | None = None,
    ) -> None:
        self._db = db
        self._profile_service = profile_service or LearnerProfileService(db)
        self._diagnosis_service = diagnosis_service or DiagnosisService(db)
        self._plan_repo = plan_repo or StudyPlanRepository(db)
        self._task_repo = task_repo or StudyTaskRepository(db)
        self._evidence_repo = evidence_repo or LearningEvidenceRepository(db)

    def build(self, learner_id: str, course_id: str) -> TutorContext:
        """构建学生某课程的学习上下文快照（纯读取，无副作用）。"""
        course_name = self._resolve_course_name(course_id)
        context_used: list[str] = []

        # Profile 只构建一次，Diagnosis 复用同一 Profile（避免重复聚合）。
        profile_out = self._profile_service.build_profile(learner_id, course_id, course_name)
        has_course = profile_out.total_knowledge_points > 0

        profile = self._to_profile(profile_out) if has_course else None
        if profile is not None:
            context_used.append("profile")

        diagnosis = self._to_diagnosis(profile_out) if has_course else None
        if diagnosis is not None:
            context_used.append("diagnosis")

        plan = self._build_plan(learner_id, course_id)
        if plan.has_plan:
            context_used.append("study_plan")

        evidence = self._build_evidence(learner_id, course_id)
        if evidence:
            context_used.append("evidence")

        return TutorContext(
            learner_id=learner_id,
            course_id=course_id,
            course_name=course_name,
            profile=profile,
            diagnosis=diagnosis,
            plan=plan,
            recent_evidence=evidence,
            context_used=context_used,
        )

    # -- 上下文片段转换（全部委托既有服务，不重复计算） --------------------------

    @staticmethod
    def _to_profile(profile: LearnerProfileOut) -> TutorProfileContext:
        return TutorProfileContext(
            overall_mastery=profile.overall_mastery,
            overall_confidence=profile.overall_confidence,
            coverage=profile.coverage,
            assessed_count=profile.assessed_count,
            total_knowledge_points=profile.total_knowledge_points,
            insufficient_data=profile.insufficient_data,
            points=[
                TutorProfilePointContext(
                    knowledge_point_id=point.knowledge_point_id,
                    knowledge_point_name=point.knowledge_point_name,
                    mastery_score=point.mastery_score,
                    status=point.status.value,
                )
                for point in profile.knowledge_points
            ],
        )

    def _to_diagnosis(self, profile: LearnerProfileOut) -> TutorDiagnosisContext:
        result = self._diagnosis_service.build_from_profile(profile)

        def _point(p) -> TutorDiagnosisPointContext:
            return TutorDiagnosisPointContext(
                knowledge_point_id=p.knowledge_point_id,
                knowledge_point_name=p.knowledge_point_name,
                mastery_score=p.mastery_score,
                status=p.status.value,
                priority_score=p.priority_score,
            )

        return TutorDiagnosisContext(
            primary_focus=_point(result.primary_focus) if result.primary_focus else None,
            weak_points=[_point(p) for p in result.weak_points],
            developing_points=[_point(p) for p in result.developing_points],
            strengths=[_point(p) for p in result.strengths],
            unassessed_points=[_point(p) for p in result.unassessed_points],
        )

    def _build_plan(self, learner_id: str, course_id: str) -> TutorPlanContext:
        # 无 current plan lifecycle：只取 generated_at DESC 第一条（最新计划）。
        plans = self._plan_repo.list_by_learner_and_course(learner_id, course_id)
        if not plans:
            return TutorPlanContext()
        latest = plans[0]
        tasks = self._task_repo.list_by_plan_id(latest.id)
        return TutorPlanContext(
            has_plan=True,
            plan_id=latest.id,
            generated_at=latest.generated_at,
            tasks=[
                TutorPlanTaskContext(
                    order=task.order,
                    knowledge_point_id=task.knowledge_point_id,
                    knowledge_point_name=task.knowledge_point_name,
                    action_type=task.action_type,  # ORM 已存稳定 enum value（str）
                    estimated_minutes=task.estimated_minutes,
                )
                for task in tasks
            ],
        )

    def _build_evidence(self, learner_id: str, course_id: str) -> list[TutorEvidenceContext]:
        records = self._evidence_repo.list_recent_by_learner(
            learner_id, course_id=course_id, limit=RECENT_EVIDENCE_LIMIT
        )
        return [
            TutorEvidenceContext(
                evidence_type=record.evidence_type.value,
                knowledge_point_id=record.knowledge_point_id,
                is_assessment=(
                    record.evidence_type.value == "practice_answer_evaluated"
                ),
                occurred_at=record.occurred_at,
            )
            for record in records
        ]

    # -- 内部辅助 ---------------------------------------------------------------

    def _resolve_course_name(self, course_id: str) -> str:
        """课程显示名：与 Diagnosis / Planner 路由一致 —— 未知课程回退 course_id。"""
        course = self._db.scalar(select(Course).where(Course.id == course_id))
        return course.name if course is not None else course_id
