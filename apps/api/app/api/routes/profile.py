"""学习画像路由 —— 提供掌握度读取与学习画像（Derived Read Model）读取。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.auth.dependencies import authorize_learning_scope, optional_current_account
from app.auth.models import AuthAccount
from app.db.session import get_db
from app.domain import LearnerProfileOut, MasteryStateOut, MessageResponse
from app.domain.models import Course
from app.services import LearnerProfileService

router = APIRouter(prefix="/profile", tags=["profile"])


def _profile(db: Session = Depends(get_db)) -> LearnerProfileService:
    return LearnerProfileService(db)


def _course_name(db: Session, course_id: str) -> str:
    course = db.scalar(select(Course).where(Course.id == course_id))
    return course.name if course else course_id


@router.get("", response_model=MessageResponse)
def profile_root() -> MessageResponse:
    settings = get_settings()
    return MessageResponse(message=f"{settings.app_name} · profile module is ready")


# 注意：mastery 路由必须在 /{learner_id} 之前声明，避免路径参数遮蔽。
@router.get("/mastery/{knowledge_point_id}", response_model=MasteryStateOut)
def get_mastery(
    knowledge_point_id: str,
    learner_id: str,
    service: LearnerProfileService = Depends(_profile),
    account: AuthAccount | None = Depends(optional_current_account),
) -> MasteryStateOut:
    """读取某位学习者某知识点的真实当前掌握度。"""
    authorize_learning_scope(account, learner_id)
    state = service.get_kp_mastery_state(learner_id, knowledge_point_id)
    if state is None:
        raise HTTPException(status_code=404, detail="no mastery record found")
    return state


@router.get("/{learner_id}", response_model=LearnerProfileOut)
def get_learner_profile(
    learner_id: str,
    course_id: str = "course-os",
    db: Session = Depends(get_db),
    service: LearnerProfileService = Depends(_profile),
    account: AuthAccount | None = Depends(optional_current_account),
) -> LearnerProfileOut:
    """读取某学生某课程的学习画像（Derived Read Model，请求时动态计算）。"""
    authorize_learning_scope(account, learner_id, course_id)
    return service.build_profile(learner_id, course_id, _course_name(db, course_id))
