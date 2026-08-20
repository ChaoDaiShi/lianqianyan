"""StudyPlanPersistenceService —— 计划持久化应用服务。

职责：把一次 `persist(draft)` 视为**一个业务动作**，在单个事务边界内：

    StudyPlanDraft
        → supersede 该 learner/course 现有 ACTIVE 计划（Active 唯一性，Phase 3-1）
        → 创建 StudyPlan（status = ACTIVE）
        → 创建 StudyTask[]（保持 Draft 顺序）
        → commit
        → 返回完整 PersistedStudyPlan（plan + tasks 聚合，非 ORM）

任何一步失败 → rollback 全部（**绝不出现** study_plans 有 Plan 但 study_tasks
缺一半的半成功状态；也绝不出现「旧计划已 supersede 但新计划未生成」）。
Repository 只做 add/flush/update，本服务负责统一 commit/rollback，
与 PracticeEvaluationService（Phase 2B 事务模式）一致。

不依赖 FastAPI；可供 HTTP Route / MCP Tool / Agent Runtime 复用。
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain import StudyPlan, StudyPlanStatus
from app.domain.planner import PersistedStudyPlan, StudyPlanDraft
from app.services.study_plan_repository import StudyPlanRepository
from app.services.study_task_repository import StudyTaskRepository


class StudyPlanPersistenceService:
    """把 StudyPlanDraft 持久化为 StudyPlan + StudyTask[]（同一事务）。"""

    def __init__(
        self,
        db: Session,
        plan_repo: StudyPlanRepository | None = None,
        task_repo: StudyTaskRepository | None = None,
    ) -> None:
        self._db = db
        self._plan_repo = plan_repo or StudyPlanRepository(db)
        self._task_repo = task_repo or StudyTaskRepository(db)

    def stage(self, draft: StudyPlanDraft) -> PersistedStudyPlan:
        """Create and flush an ACTIVE plan aggregate without committing."""
        plan = self._plan_repo.create(
            learner_id=draft.learner_id,
            course_id=draft.course_id,
            strategy=draft.strategy,
            status=StudyPlanStatus.ACTIVE,
            generated_at=draft.generated_at,
            source_diagnosis_generated_at=draft.source_diagnosis_generated_at,
            reason_codes=draft.reason_codes,
        )
        task_records = self._task_repo.create_many(plan_id=plan.id, tasks=draft.tasks)
        return self._to_persisted(plan, task_records)

    def persist(self, draft: StudyPlanDraft) -> PersistedStudyPlan:
        """持久化一份 Planner 输出，返回完整 Persistent Plan。

        - Empty Draft（tasks=[]）同样有效：它代表一次真实规划结果
          （NO_IMMEDIATE_INTERVENTION），不因 tasks=0 报错。
        - 新计划 status 恒为 ACTIVE；持久化前先 supersede 同 learner/course 的
          旧 ACTIVE 计划（同一事务）—— 保证任意时刻只有一个 ACTIVE 计划。
        """
        try:
            self._plan_repo.supersede_active_for_learner_course(
                draft.learner_id, draft.course_id
            )
            persisted = self.stage(draft)
            self._db.commit()
        except Exception:
            self._db.rollback()
            raise

        return persisted

    @staticmethod
    def _to_persisted(
        plan: StudyPlan, task_records: list[object]
    ) -> PersistedStudyPlan:
        """ORM → 领域输出模型（enum 还原统一由 Repository 的 to_domain 负责）。"""
        return StudyPlanRepository.to_domain(plan, list(task_records))
