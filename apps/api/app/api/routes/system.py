from __future__ import annotations

from fastapi import APIRouter

from app.llm.status import LlmStatus, get_llm_status

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/llm", response_model=LlmStatus)
def llm_status() -> LlmStatus:
    return get_llm_status()
