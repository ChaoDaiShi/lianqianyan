"""学习证据服务 —— Service 层。

提供「记录学习证据」的领域操作。上游（API 路由 / 未来 MCP Tool / Agent）
通过本层访问 LearningEvidence。本层不管理整体事务边界（由 Application Service 控制）。
"""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.domain import EvidenceSource, EvidenceType, LearningEvidenceOut
from app.services.learning_evidence import LearningEvidenceRepository


class LearningEvidenceService:
    """围绕 LearningEvidence 的领域服务。"""

    def __init__(self, db: Session) -> None:
        self._repo = LearningEvidenceRepository(db)

    def start_learning(
        self,
        learner_id: str,
        source: EvidenceSource,
        knowledge_point_id: str | None = None,
        course_id: str | None = None,
        topic: str | None = None,
    ) -> LearningEvidenceOut:
        """开启一段学习 —— 记录 `learning_started` 行为证据。

        语义：只是行为证据，**不得**提高掌握度。
        source 由调用方传入（如 current_study_plan / recommended_path）。
        返回 evidence 携带 session_id（本轮作为关联标识，不构造完整领域会话）。
        """
        session_id = str(uuid.uuid4())
        return self._repo.create(
            learner_id=learner_id,
            evidence_type=EvidenceType.LEARNING_STARTED,
            source=source,
            knowledge_point_id=knowledge_point_id,
            course_id=course_id,
            session_id=session_id,
            payload={"action": "start_learning", "correlation_id": session_id, "topic": topic or ""},
        )

    def list_evidence(self) -> list[LearningEvidenceOut]:
        """列出全部学习证据。"""
        return self._repo.list_all()

    @property
    def repository(self) -> LearningEvidenceRepository:
        """暴露仓库，供 Application Service 复用同一会话。"""
        return self._repo
