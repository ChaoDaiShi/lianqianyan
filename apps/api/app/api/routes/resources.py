from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.resources import (
    GeneratedResource,
    KnowledgeResourceNotFound,
    ResourceGenerationRequest,
    ResourceGenerationService,
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
