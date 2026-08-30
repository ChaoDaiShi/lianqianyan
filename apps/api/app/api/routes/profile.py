"""学习画像路由 —— 提供掌握度读取与学习画像（Derived Read Model）读取。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.auth.dependencies import authorize_learning_scope, optional_current_account
from app.auth.models import AuthAccount
from app.db.session import get_db
from app.domain import LearnerProfileOut, MasteryStateOut, MessageResponse
from app.domain.models import Course
from app.services import LearnerProfileService
from app.llm.provider import LLMMessage
from app.preferences.providers import account_llm_provider
from app.core.config import Settings

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileSummaryRequest(BaseModel):
    learner_id: str = Field(min_length=1, max_length=100)
    course_id: str = Field(min_length=1, max_length=100)


class ProfileSummaryResponse(BaseModel):
    summary: str
    provider: str
    model: str | None = None


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


@router.post("/ai-summary", response_model=ProfileSummaryResponse)
async def summarize_profile(
    payload: ProfileSummaryRequest,
    db: Session = Depends(get_db),
    service: LearnerProfileService = Depends(_profile),
    account: AuthAccount | None = Depends(optional_current_account),
    settings: Settings = Depends(get_settings),
) -> ProfileSummaryResponse:
    authorize_learning_scope(account, payload.learner_id, payload.course_id)
    profile = service.build_profile(payload.learner_id, payload.course_id, _course_name(db, payload.course_id))
    evidence = [
        {"name": point.knowledge_point_name, "status": point.status, "mastery": point.mastery_score, "confidence": point.confidence, "evidence_count": point.evidence_count}
        for point in profile.knowledge_points
    ]
    provider = account_llm_provider(db, settings, account)
    try:
        result = await provider.chat([
            LLMMessage(role="system", content="你是学习画像分析助手。只依据输入证据，用中文输出 3 段简短总结：优势、关注点、下一步。缺失数据必须明确写暂无证据，不得推测。"),
            LLMMessage(role="user", content=str({"course": profile.course_name, "overall_mastery": profile.overall_mastery, "coverage": profile.coverage, "knowledge_points": evidence})),
        ])
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI profile summary is unavailable") from exc
    return ProfileSummaryResponse(summary=result.content, provider=provider.name, model=result.usage.get("model"))
