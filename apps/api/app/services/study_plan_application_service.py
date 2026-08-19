"""StudyPlanApplicationService —— 学习计划应用编排服务（Phase 2D-2）。

职责：串联「生成 / 读取 / 历史」三个应用动作，保持单向领域链路：

    generate_plan(learner_id, course_id)
        → DiagnosisService（真实诊断，绝不自行读 Mastery 再判断）
        → StudyPlannerService（确定性规划）
        → StudyPlanPersistenceService（Plan + Tasks 同一事务落库）
        → PersistedStudyPlan

    get_plan(plan_id)
        → StudyPlanRepository.get_by_id + StudyTaskRepository.list_by_plan_id
        → 重建完整 PersistedStudyPlan（不写 DB，无副作用）

    get_current(learner_id, course_id)
        → StudyPlanRepository.get_current（唯一 ACTIVE）
        → 重建完整 PersistedStudyPlan（无副作用）

    list_history(learner_id, course_id)
        → StudyPlanRepository.list_by_learner_and_course（generated_at DESC）
        → 摘要列表（task_count，不展开全部 Tasks）

边界（严格遵守）：
- 不负责 HTTP / SQLAlchemy 查询细节 / Planner Algorithm / LLM / React。
- 不重新实现 Diagnosis threshold / Planner Action mapping / Action Tier /
  primary_focus 排序 / Duration / MAX_TASKS / Persistence mapping。
- 客户端不得提交 Diagnosis / Tasks —— 全部由服务端确定性生成。
- 事务边界在 PersistenceService（commit/rollback，含 supersede），
  ApplicationService 不 db.commit()。
- Active 唯一性（新 Plan 落库时旧 ACTIVE 自动 supersede）由
  PersistenceService 保证；这里只读取「当前 ACTIVE」。
- 不依赖 FastAPI；可供 HTTP Route / MCP Tool / Agent Runtime 复用。
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain import (
    Course,
    PersistedStudyPlan,
    PersistedStudyPlanSummary,
)
from app.services.diagnosis_service import DiagnosisService
from app.services.study_plan_persistence_service import StudyPlanPersistenceService
from app.services.study_plan_repository import StudyPlanRepository
from app.services.study_planner_service import StudyPlannerService
from app.services.study_task_repository import StudyTaskRepository

logger = logging.getLogger(__name__)


class StudyPlanApplicationService:
    """学习计划的应用编排（生成 / 详情 / 历史）。"""

    def __init__(
        self,
        db: Session,
        diagnosis_service: DiagnosisService | None = None,
        planner_service: StudyPlannerService | None = None,
        persistence_service: StudyPlanPersistenceService | None = None,
        plan_repo: StudyPlanRepository | None = None,
        task_repo: StudyTaskRepository | None = None,
    ) -> None:
        self._db = db
        self._diagnosis = diagnosis_service or DiagnosisService(db)
        self._planner = planner_service or StudyPlannerService()
        self._persistence = persistence_service or StudyPlanPersistenceService(
            db, plan_repo=plan_repo, task_repo=task_repo
        )
        self._plan_repo = plan_repo or StudyPlanRepository(db)
        self._task_repo = task_repo or StudyTaskRepository(db)

    # -- 生成（显式业务动作，唯一入口是客户端表达「给这个 learner/course 生成计划」） ----

    def generate_plan(self, learner_id: str, course_id: str) -> PersistedStudyPlan:
        """编排 Diagnosis → Planner → Persistence，返回完整持久化计划。

        客户端不得提交 Diagnosis / Tasks / Draft：它们全部由服务端确定性生成。
        """
        course_name = self._resolve_course_name(course_id)
        diagnosis = self._diagnosis.diagnose_learner_course(
            learner_id, course_id, course_name
        )
        draft = self._planner.generate_from_diagnosis(learner_id, course_id, diagnosis)
        persisted = self._persistence.persist(draft)

        logger.info(
            "study plan generated: plan_id=%s learner_id=%s course_id=%s task_count=%d",
            persisted.id,
            persisted.learner_id,
            persisted.course_id,
            len(persisted.tasks),
        )
        return persisted

    # -- 详情 / 当前计划（读取无副作用，不写 DB） --------------------------------

    def get_plan(self, plan_id: str) -> PersistedStudyPlan | None:
        """按 plan_id 重建完整 Plan + 按 order 排序的 Tasks；不存在返回 None。"""
        plan = self._plan_repo.get_by_id(plan_id)
        if plan is None:
            return None
        tasks = self._task_repo.list_by_plan_id(plan_id)
        return StudyPlanRepository.to_domain(plan, tasks)

    def get_current(self, learner_id: str, course_id: str) -> PersistedStudyPlan | None:
        """读取该 learner/course 的当前 ACTIVE 计划（完整 Plan + Tasks）。

        - 无当前计划（从未生成 / 被 Empty Plan 取代后）→ None。
        - 纯读取：不自动生成、不 refresh Diagnosis、不写 DB。
        """
        plan = self._plan_repo.get_current(learner_id, course_id)
        if plan is None:
            return None
        tasks = self._task_repo.list_by_plan_id(plan.id)
        return StudyPlanRepository.to_domain(plan, tasks)

    # -- 历史（读取无副作用；generated_at DESC 由 Repository 保证，不二次排序） -------

    def list_history(
        self, learner_id: str, course_id: str
    ) -> list[PersistedStudyPlanSummary]:
        """返回某学习者某课程的 Plan History 摘要（最新在前，不含 Tasks）。"""
        plans = self._plan_repo.list_by_learner_and_course(learner_id, course_id)
        return [
            StudyPlanRepository.to_summary(plan, self._task_repo.count_by_plan_id(plan.id))
            for plan in plans
        ]

    # -- 内部辅助 ---------------------------------------------------------------

    def _resolve_course_name(self, course_id: str) -> str:
        """课程显示名：与 Diagnosis 路由一致 —— 未知课程回退 course_id（不制造 404）。

        Phase 2D 当前领域语义：未知课程 → 0 知识点 → Empty Plan（合法规划结果），
        不是 Not Found；因此这里不抛 404，交给 Diagnosis 自然产生空诊断。
        """
        course: Any = self._db.scalar(select(Course).where(Course.id == course_id))
        return course.name if course is not None else course_id
