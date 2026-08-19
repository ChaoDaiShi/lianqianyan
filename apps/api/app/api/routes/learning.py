"""学习证据与学习会话相关路由。

LearningEvidence 是 EducationMind 的核心数据。此路由提供学习开始与证据记录端点。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.domain import (
    EvidenceSource,
    LearningEvidenceIn,
    LearningEvidenceOut,
    LearningStartResponse,
    MessageResponse,
)
from app.services import LearningEvidenceService

router = APIRouter(prefix="/learning", tags=["learning"])


def _service(db: Session = Depends(get_db)) -> LearningEvidenceService:
    return LearningEvidenceService(db)


@router.get("", response_model=MessageResponse)
def learning_root() -> MessageResponse:
    settings = get_settings()
    return MessageResponse(message=f"{settings.app_name} · learning module is ready")


@router.post("/start", response_model=LearningStartResponse, status_code=201)
def start_learning(
    learner_id: str,
    source: EvidenceSource = EvidenceSource.CURRENT_STUDY_PLAN,
    knowledge_point_id: str | None = None,
    course_id: str | None = None,
    topic: str | None = None,
    service: LearningEvidenceService = Depends(_service),
    db: Session = Depends(get_db),
) -> LearningStartResponse:
    """开启一段学习 —— 记录 `learning_started` 行为证据（不得改变掌握度）。

    客户端通过 `source` 明确行为来自哪里（current_study_plan / recommended_path …）。

    本路由作为该写操作的业务事务边界：创建 learning_started 证据后统一提交，
    与 practice/evaluate 的「证据 + 掌握度更新单事务」保持一致。
    """
    evidence = service.start_learning(
        learner_id=learner_id,
        source=source,
        knowledge_point_id=knowledge_point_id,
        course_id=course_id,
        topic=topic,
    )
    db.commit()
    return LearningStartResponse(
        message="小涟已记录本次学习开始",
        evidence=evidence,
        session_id=evidence.session_id or "",
    )


@router.get("/evidence", response_model=list[LearningEvidenceOut])
def list_evidence(
    service: LearningEvidenceService = Depends(_service),
) -> list[LearningEvidenceOut]:
    """列出已持久化的学习证据。"""
    return service.list_evidence()
