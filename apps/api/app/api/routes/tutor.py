"""小涟教育导师路由（Phase 3-0）。

API 语义：
    POST /api/tutor/chat → 学生提问 → 读取学习上下文 → 个性化回答

约定：
- Route **不直接调用 LLM**：请求 → TutorService → TutorContextBuilder → LLM Provider，
  保持 Application Layer（所有领域逻辑 / LLM 调用都在服务层）。
- 客户端只提交 learner_id / course_id / message，**不得提交任何学习上下文**。
- 不保存聊天历史（请求级 Context）。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import authorize_learning_scope, optional_current_account
from app.auth.models import AuthAccount
from app.domain.tutor import TutorConversationRequest, TutorResponse
from app.services import TutorService

router = APIRouter(prefix="/tutor", tags=["tutor"])


def _service(db: Session = Depends(get_db)) -> TutorService:
    return TutorService(db)


@router.post("/chat", response_model=TutorResponse)
async def chat(
    payload: TutorConversationRequest,
    service: TutorService = Depends(_service),
    account: AuthAccount | None = Depends(optional_current_account),
) -> TutorResponse:
    """学生提问 → 返回小涟的个性化教育回答（含 context_used / suggested_actions）。"""
    authorize_learning_scope(account, payload.learner_id, payload.course_id)
    return await service.chat(payload)
