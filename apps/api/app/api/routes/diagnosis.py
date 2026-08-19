"""学习诊断路由 —— 提供结构化学习诊断（确定性 Domain 诊断，不使用 LLM）。"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.domain import DiagnosisResultOut, MessageResponse
from app.domain.models import Course
from app.services import DiagnosisService

router = APIRouter(prefix="/diagnosis", tags=["diagnosis"])


def _service(db: Session = Depends(get_db)) -> DiagnosisService:
    return DiagnosisService(db)


def _course_name(db: Session, course_id: str) -> str:
    course = db.scalar(select(Course).where(Course.id == course_id))
    return course.name if course else course_id


@router.get("", response_model=MessageResponse)
def diagnosis_root() -> MessageResponse:
    settings = get_settings()
    return MessageResponse(message=f"{settings.app_name} · diagnosis module is ready")


@router.get("/{learner_id}", response_model=DiagnosisResultOut)
def get_diagnosis(
    learner_id: str,
    course_id: str = "course-os",
    db: Session = Depends(get_db),
    service: DiagnosisService = Depends(_service),
) -> DiagnosisResultOut:
    """返回某学生某课程的结构化学习诊断。"""
    return service.diagnose_learner_course(learner_id, course_id, _course_name(db, course_id))
