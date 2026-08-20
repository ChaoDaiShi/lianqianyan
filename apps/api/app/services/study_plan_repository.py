"""学习计划持久化 —— Repository 层。

事务纪律与 MasteryRepository 一致：Repository 只做 add/flush/query，
不擅自 commit，由上层 Application Service（StudyPlanPersistenceService）
控制统一 commit/rollback。

Repository 负责 Domain Enum ↔ DB 表示转换（strategy / status / reason_codes
保存稳定 enum value，读取时还原为 Domain Enum）；上层服务不手工 json 序列化。
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.domain import (
    PlanStrategy,
    PlannerReasonCode,
    StudyPlan,
    StudyPlanStatus,
)
from app.domain.models import StudyTask
from app.domain.planner import PersistedStudyPlan, PersistedStudyPlanSummary
from app.services.study_task_repository import StudyTaskRepository

logger = logging.getLogger(__name__)


class StudyPlanRepository:
    """StudyPlan 的持久化仓库。"""

    def __init__(self, db: Session) -> None:
        self._db = db

    def create(
        self,
        *,
        learner_id: str,
        course_id: str,
        strategy: PlanStrategy,
        status: StudyPlanStatus,
        generated_at: datetime,
        source_diagnosis_generated_at: datetime,
        reason_codes: list[PlannerReasonCode],
    ) -> StudyPlan:
        """新建一条计划（仅 add + flush，不 commit）。

        正式 `id` 由服务端 UUID 生成，调用方/Draft 不能控制。
        """
        now = datetime.utcnow()
        plan = StudyPlan(
            id=str(uuid.uuid4()),
            learner_id=learner_id,
            course_id=course_id,
            strategy=strategy.value,
            status=status.value,
            generated_at=generated_at,
            source_diagnosis_generated_at=source_diagnosis_generated_at,
            reason_codes=[code.value for code in reason_codes],
            created_at=now,
            updated_at=now,
        )
        self._db.add(plan)
        self._db.flush()
        return plan

    def get_by_id(self, plan_id: str) -> StudyPlan | None:
        """按主键读取计划（返回 ORM 实体）。"""
        return self._db.get(StudyPlan, plan_id)

    def list_by_learner_and_course(
        self, learner_id: str, course_id: str
    ) -> list[StudyPlan]:
        """列出某学习者某课程的 Plan History（按 generated_at 倒序，最新在前）。"""
        return list(
            self._db.scalars(
                select(StudyPlan)
                .where(
                    StudyPlan.learner_id == learner_id,
                    StudyPlan.course_id == course_id,
                )
                .order_by(StudyPlan.generated_at.desc())
            ).all()
        )

    def get_active_by_learner_and_course(
        self, learner_id: str, course_id: str
    ) -> StudyPlan | None:
        """Read the newest ACTIVE plan without repairing legacy duplicate rows."""
        plans = list(
            self._db.scalars(
                select(StudyPlan)
                .where(
                    StudyPlan.learner_id == learner_id,
                    StudyPlan.course_id == course_id,
                    StudyPlan.status == StudyPlanStatus.ACTIVE.value,
                )
                .order_by(StudyPlan.generated_at.desc())
                .limit(2)
            ).all()
        )
        if len(plans) > 1:
            logger.warning(
                "multiple active plans detected: learner_id=%s course_id=%s",
                learner_id,
                course_id,
            )
        return plans[0] if plans else None

    def get_current(self, learner_id: str, course_id: str) -> StudyPlan | None:
        """Compatibility alias for the formal current-plan repository method."""
        return self.get_active_by_learner_and_course(learner_id, course_id)

    def supersede_active_for_learner_course(
        self,
        learner_id: str,
        course_id: str,
        *,
        except_plan_id: str | None = None,
    ) -> int:
        """Mark scoped ACTIVE plans SUPERSEDED without committing."""
        stmt = (
            update(StudyPlan)
            .where(
                StudyPlan.learner_id == learner_id,
                StudyPlan.course_id == course_id,
                StudyPlan.status == StudyPlanStatus.ACTIVE.value,
            )
            .values(
                status=StudyPlanStatus.SUPERSEDED.value,
                updated_at=datetime.utcnow(),
            )
        )
        if except_plan_id is not None:
            stmt = stmt.where(StudyPlan.id != except_plan_id)
        result = self._db.execute(stmt)
        return result.rowcount or 0

    def supersede_active_plans(
        self,
        learner_id: str,
        course_id: str,
        *,
        except_plan_id: str | None = None,
    ) -> int:
        """Compatibility alias for existing callers."""
        return self.supersede_active_for_learner_course(
            learner_id,
            course_id,
            except_plan_id=except_plan_id,
        )

    @staticmethod
    def to_domain(plan: StudyPlan, tasks: list[StudyTask]) -> PersistedStudyPlan:
        """ORM → 领域输出模型（plan + tasks 聚合；tasks 由 StudyTaskRepository 还原）。

        与 StudyTaskRepository.to_domain 对称：Repository 层统一负责
        Domain Enum ↔ DB 表示的转换，上层服务不手工 json 序列化。
        """
        return PersistedStudyPlan(
            id=plan.id,
            learner_id=plan.learner_id,
            course_id=plan.course_id,
            status=StudyPlanStatus(plan.status),
            strategy=PlanStrategy(plan.strategy),
            generated_at=plan.generated_at,
            source_diagnosis_generated_at=plan.source_diagnosis_generated_at,
            reason_codes=[PlannerReasonCode(code) for code in plan.reason_codes],
            created_at=plan.created_at,
            updated_at=plan.updated_at,
            tasks=[StudyTaskRepository.to_domain(task) for task in tasks],
        )

    @staticmethod
    def to_summary(plan: StudyPlan, task_count: int) -> PersistedStudyPlanSummary:
        """ORM → 计划摘要（Plan History 列表项，不含 Tasks）。"""
        return PersistedStudyPlanSummary(
            id=plan.id,
            learner_id=plan.learner_id,
            course_id=plan.course_id,
            strategy=PlanStrategy(plan.strategy),
            status=StudyPlanStatus(plan.status),
            generated_at=plan.generated_at,
            created_at=plan.created_at,
            task_count=task_count,
            reason_codes=[PlannerReasonCode(code) for code in plan.reason_codes],
        )
