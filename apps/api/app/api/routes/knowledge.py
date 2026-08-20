from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.knowledge import (
    KnowledgePointContent,
    KnowledgeRepository,
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    LexicalKnowledgeRetriever,
)

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.post("/search", response_model=KnowledgeSearchResponse)
def search(payload: KnowledgeSearchRequest) -> KnowledgeSearchResponse:
    results = LexicalKnowledgeRetriever().retrieve(
        payload.course_id,
        payload.query,
        payload.knowledge_point_id,
        payload.top_k,
    )
    return KnowledgeSearchResponse(results=results)


@router.get("/points/{knowledge_point_id}", response_model=KnowledgePointContent)
def get_point(
    knowledge_point_id: str,
    course_id: str = Query(default="course-os", min_length=1),
) -> KnowledgePointContent:
    point = KnowledgeRepository().get_point_content(course_id, knowledge_point_id)
    if point is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="knowledge point not found",
        )
    return point
