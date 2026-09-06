from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import optional_current_account
from app.auth.models import AuthAccount
from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.llm.provider import LLMMessage
from app.preferences.providers import account_llm_provider

from app.resources import (
    GeneratedResource,
    KnowledgeResourceNotFound,
    ResourceGenerationRequest,
    ResourceGenerationService,
    GeneratedResourceImage,
    MiniMaxImageService,
    OptimizedResource,
    ResourceImageRequest,
    ResourceImageUnavailable,
    ResourceOptimizeRequest,
    TextCheckOut,
    TextVerifyRequest,
    plan_image,
    verify_text,
)

router = APIRouter(prefix="/resources", tags=["learning-resources"])


@router.post("/generate", response_model=GeneratedResource)
def generate_resource(payload: ResourceGenerationRequest) -> GeneratedResource:
    try:
        return ResourceGenerationService().generate(payload)
    except KnowledgeResourceNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="course knowledge point not found",
        ) from exc


@router.post("/image", response_model=GeneratedResourceImage)
async def generate_resource_image(payload: ResourceImageRequest, settings: Settings = Depends(get_settings)) -> GeneratedResourceImage:
    try:
        return await MiniMaxImageService(settings).generate(payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="course knowledge point not found") from exc
    except ResourceImageUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post("/image/plan")
async def plan_resource_image(
    payload: ResourceImageRequest,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
    account: AuthAccount | None = Depends(optional_current_account),
) -> dict:
    """AI 评判是否值得配图并给出图标隐喻构图方案；LLM 不可用时诚实降级为默认方案。"""
    from app.resources.models import ImagePlanPayload

    point = MiniMaxImageService.point_content(payload.course_id, payload.knowledge_point_id)
    if point is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="course knowledge point not found")
    section_titles = [section.title for section in point.sections[:6]]
    provider = account_llm_provider(db, settings, account)
    plan = await plan_image(provider, point.title, section_titles)
    if plan is None:
        return ImagePlanPayload(
            should_generate=True,
            reason="AI 配图方案暂不可用，使用默认章节隐喻方案",
            central_metaphor="",
            card_metaphors=section_titles,
            planned_by="heuristic",
        ).model_dump()
    return ImagePlanPayload(
        should_generate=plan.should_generate,
        reason=plan.reason,
        central_metaphor=plan.central_metaphor,
        card_metaphors=plan.card_metaphors,
        planned_by="llm",
    ).model_dump()


@router.post("/verify-text", response_model=TextCheckOut)
async def verify_resource_text(
    payload: TextVerifyRequest,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
    account: AuthAccount | None = Depends(optional_current_account),
) -> TextCheckOut:
    """AI 文字质量检查：乱码、截断、占位符、空章节、重复；LLM 不可用时如实返回不可用。"""
    provider = account_llm_provider(db, settings, account)
    check = await verify_text(provider, payload.content)
    if check is None:
        return TextCheckOut(available=False)
    return TextCheckOut(available=True, passed=check.passed, summary=check.summary, issues=check.issues, provider=provider.name)


@router.post("/optimize", response_model=OptimizedResource)
async def optimize_resource(
    payload: ResourceOptimizeRequest,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
    account: AuthAccount | None = Depends(optional_current_account),
) -> OptimizedResource:
    provider = account_llm_provider(db, settings, account)
    try:
        result = await provider.chat([
            LLMMessage(role="system", content="你是学习资源编辑。只优化结构和表达，不添加未给出的事实。保留 Markdown；标题清晰，重点使用 **加粗**，关键警示用 <span style=\"color:#dc2626\">红色</span>。"),
            LLMMessage(role="user", content=payload.content),
        ])
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI optimization is unavailable") from exc
    return OptimizedResource(content=result.content, provider=provider.name, model=result.usage.get("model"))
