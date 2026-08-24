"""掌握度持久化 —— Repository 层。

负责 MasteryRecord 的数据访问。事务纪律与 LearningEvidence 一致：
Repository 只做 add/query/update，不擅自 commit，由上层 Application Service 控制事务。
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.domain import MasteryRecord


class MasteryRepository:
    """MasteryRecord 的持久化仓库。"""

    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_learner_and_knowledge_point(
        self, learner_id: str, knowledge_point_id: str
    ) -> MasteryRecord | None:
        """按 learner + knowledge point 查询当前掌握记录（唯一）。"""
        return self._db.scalar(
            select(MasteryRecord).where(
                MasteryRecord.learner_id == learner_id,
                MasteryRecord.knowledge_point_id == knowledge_point_id,
            )
        )

    def create(
        self,
        *,
        learner_id: str,
        knowledge_point_id: str,
        mastery_score: float,
        confidence: float,
        evidence_count: int,
    ) -> MasteryRecord:
        """新建一条掌握记录（仅 add + flush，不 commit）。"""
        record = MasteryRecord(
            id=str(uuid.uuid4()),
            learner_id=learner_id,
            knowledge_point_id=knowledge_point_id,
            mastery_score=mastery_score,
            confidence=confidence,
            evidence_count=evidence_count,
            created_at=utc_now(),
            updated_at=utc_now(),
        )
        self._db.add(record)
        self._db.flush()
        return record

    def update(
        self,
        record: MasteryRecord,
        *,
        mastery_score: float,
        confidence: float,
        evidence_count: int,
    ) -> MasteryRecord:
        """就地更新掌握记录字段（不 commit，交由上层控制）。"""
        record.mastery_score = mastery_score
        record.confidence = confidence
        record.evidence_count = evidence_count
        record.updated_at = utc_now()
        return record

    def get_or_create(
        self,
        *,
        learner_id: str,
        knowledge_point_id: str,
        initial_mastery: float = 0.0,
        initial_confidence: float = 0.0,
        initial_evidence_count: int = 0,
    ) -> MasteryRecord:
        """获取当前记录；不存在则创建（`learner_id + knowledge_point_id` 唯一）。"""
        record = self.get_by_learner_and_knowledge_point(learner_id, knowledge_point_id)
        if record is None:
            record = self.create(
                learner_id=learner_id,
                knowledge_point_id=knowledge_point_id,
                mastery_score=initial_mastery,
                confidence=initial_confidence,
                evidence_count=initial_evidence_count,
            )
        return record

    def list_all(self) -> list[MasteryRecord]:
        """列出全部掌握记录。"""
        return list(self._db.scalars(select(MasteryRecord)).all())
