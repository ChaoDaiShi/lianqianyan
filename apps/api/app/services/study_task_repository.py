"""计划任务持久化 —— Repository 层。

事务纪律与 MasteryRepository 一致：只做 add/flush/query，不 commit。
Repository 负责 StudyTaskDraft ↔ StudyTask 的表示转换
（action_type / reason_codes / source_status 保存稳定 enum value，
读取时还原为 Domain Enum）。

`list_by_plan_id` 必须显式 ORDER BY order，不依赖数据库默认返回顺序，
保证 Draft 中的任务顺序原样还原。
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain import (
    DiagnosisStatus,
    PlannerActionType,
    PlannerReasonCode,
    StudyTask,
)
from app.domain.planner import PersistedStudyTask, StudyTaskDraft


class StudyTaskRepository:
    """StudyTask 的持久化仓库。"""

    def __init__(self, db: Session) -> None:
        self._db = db

    def create_many(
        self, *, plan_id: str, tasks: list[StudyTaskDraft]
    ) -> list[StudyTask]:
        """批量创建任务（仅 add_all + flush，不 commit）。

        每个任务的正式 `id` 由服务端 UUID 生成；`draft_key` 仅作来源追踪，
        不是主键替代。
        """
        now = datetime.utcnow()
        records = [
            StudyTask(
                id=str(uuid.uuid4()),
                plan_id=plan_id,
                knowledge_point_id=task.knowledge_point_id,
                knowledge_point_name=task.knowledge_point_name,
                action_type=task.action_type.value,
                priority=task.priority,
                estimated_minutes=task.estimated_minutes,
                reason_codes=[code.value for code in task.reason_codes],
                source_status=task.source_status.value,
                source_priority_score=task.source_priority_score,
                order=task.order,
                draft_key=task.draft_key,
                created_at=now,
                updated_at=now,
            )
            for task in tasks
        ]
        self._db.add_all(records)
        self._db.flush()
        return records

    def list_by_plan_id(self, plan_id: str) -> list[StudyTask]:
        """按计划读取任务，显式 ORDER BY order（保持 Draft 顺序）。"""
        return list(
            self._db.scalars(
                select(StudyTask)
                .where(StudyTask.plan_id == plan_id)
                .order_by(StudyTask.order)
            ).all()
        )

    def count_by_plan_id(self, plan_id: str) -> int:
        """统计某计划的任务数（Plan History Summary 用，避免展开全部任务）。"""
        return int(
            self._db.scalar(
                select(func.count(StudyTask.id)).where(StudyTask.plan_id == plan_id)
            )
            or 0
        )

    @staticmethod
    def to_domain(task: StudyTask) -> PersistedStudyTask:
        """ORM → 领域输出模型（还原 Domain Enum）。"""
        return PersistedStudyTask(
            id=task.id,
            plan_id=task.plan_id,
            draft_key=task.draft_key,
            knowledge_point_id=task.knowledge_point_id,
            knowledge_point_name=task.knowledge_point_name,
            action_type=PlannerActionType(task.action_type),
            priority=task.priority,
            estimated_minutes=task.estimated_minutes,
            reason_codes=[PlannerReasonCode(code) for code in task.reason_codes],
            source_status=DiagnosisStatus(task.source_status),
            source_priority_score=task.source_priority_score,
            order=task.order,
            created_at=task.created_at,
        )
