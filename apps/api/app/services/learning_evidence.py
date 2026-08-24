"""学习证据持久化 —— Repository 层。

将 SQLAlchemy ORM 模型与基础数据访问封装为仓库，供 Service 层使用。

事务纪律：Repository 只负责 add/query，**不擅自 commit**。
整个业务动作（如「创建证据 + 更新掌握度」）的事务边界由上层 Application Service 控制。
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.domain import EvidenceSource, EvidenceType, LearningEvidence, LearningEvidenceOut


class LearningEvidenceRepository:
    """LearningEvidence 的持久化仓库。"""

    def __init__(self, db: Session) -> None:
        self._db = db

    def create(
        self,
        *,
        learner_id: str,
        evidence_type: EvidenceType,
        source: EvidenceSource,
        knowledge_point_id: str | None = None,
        course_id: str | None = None,
        question_id: str | None = None,
        session_id: str | None = None,
        mastery_delta: float | None = None,
        payload: dict | None = None,
        occurred_at: datetime | None = None,
    ) -> LearningEvidenceOut:
        """写入一条学习证据并返回带 id 的模型。

        id 与 occurred_at 由服务端生成，客户端无法覆盖。
        仅加入会话（默认 autoflush），不 commit —— 由上层服务控制事务。
        """
        now = occurred_at or utc_now()
        record = LearningEvidence(
            id=str(uuid.uuid4()),
            learner_id=learner_id,
            evidence_type=evidence_type.value,
            source=source.value,
            knowledge_point_id=knowledge_point_id,
            course_id=course_id,
            question_id=question_id,
            session_id=session_id,
            mastery_delta=mastery_delta,
            payload=json.dumps(payload or {}, ensure_ascii=False),
            occurred_at=now,
        )
        self._db.add(record)
        self._db.flush()
        return self._to_out(record)

    def update_payload(self, evidence_id: str, additions: dict) -> LearningEvidenceOut | None:
        """在当前业务事务内补充服务端派生的证据字段。"""
        record = self._db.get(LearningEvidence, evidence_id)
        if record is None:
            return None
        try:
            payload = json.loads(record.payload or "{}")
        except json.JSONDecodeError:
            payload = {}
        payload.update(additions)
        record.payload = json.dumps(payload, ensure_ascii=False)
        self._db.flush()
        return self._to_out(record)

    def list_all(self) -> list[LearningEvidenceOut]:
        """列出全部学习证据（按时间倒序）。"""
        records = self._db.scalars(
            select(LearningEvidence).order_by(LearningEvidence.occurred_at.desc())
        ).all()
        return [self._to_out(r) for r in records]

    def list_by_learner_and_knowledge_point(
        self, learner_id: str, knowledge_point_id: str
    ) -> list[LearningEvidenceOut]:
        """列出某位学习者在某知识点上的学习证据。"""
        records = self._db.scalars(
            select(LearningEvidence)
            .where(
                LearningEvidence.learner_id == learner_id,
                LearningEvidence.knowledge_point_id == knowledge_point_id,
            )
            .order_by(LearningEvidence.occurred_at.asc())
        ).all()
        return [self._to_out(r) for r in records]

    def get_by_id(self, evidence_id: str) -> LearningEvidenceOut | None:
        """按 id 查询学习证据。"""
        record = self._db.get(LearningEvidence, evidence_id)
        return self._to_out(record) if record else None

    def list_recent_by_learner(
        self, learner_id: str, course_id: str | None = None, limit: int = 5
    ) -> list[LearningEvidenceOut]:
        """读取某学习者最近 N 条学习证据（occurred_at DESC，供 Tutor 上下文使用）。

        纯读取、无副作用；`course_id` 可选过滤（保持课程上下文隔离）。
        """
        query = select(LearningEvidence).where(LearningEvidence.learner_id == learner_id)
        if course_id is not None:
            query = query.where(LearningEvidence.course_id == course_id)
        records = self._db.scalars(
            query.order_by(LearningEvidence.occurred_at.desc()).limit(limit)
        ).all()
        return [self._to_out(r) for r in records]

    @staticmethod
    def _to_out(record: LearningEvidence) -> LearningEvidenceOut:
        try:
            payload_dict = json.loads(record.payload or "{}")
        except json.JSONDecodeError:
            payload_dict = {}
        return LearningEvidenceOut(
            id=record.id,
            learner_id=record.learner_id,
            evidence_type=EvidenceType(record.evidence_type),
            source=EvidenceSource(record.source),
            knowledge_point_id=record.knowledge_point_id,
            course_id=record.course_id,
            question_id=record.question_id,
            session_id=record.session_id,
            mastery_delta=record.mastery_delta,
            payload=payload_dict,
            occurred_at=record.occurred_at,
        )
