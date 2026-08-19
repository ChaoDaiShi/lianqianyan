"""KnowledgePoint 数据访问 —— Repository 层。"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import KnowledgePoint


class KnowledgePointRepository:
    """KnowledgePoint 的查询仓库。"""

    def __init__(self, db: Session) -> None:
        self._db = db

    def list_by_course(self, course_id: str) -> list[KnowledgePoint]:
        """列出某课程下的全部知识点。"""
        return list(
            self._db.scalars(
                select(KnowledgePoint).where(KnowledgePoint.course_id == course_id)
            ).all()
        )

    def get_by_id(self, knowledge_point_id: str) -> KnowledgePoint | None:
        return self._db.get(KnowledgePoint, knowledge_point_id)

    def list_all(self) -> list[KnowledgePoint]:
        return list(self._db.scalars(select(KnowledgePoint)).all())
