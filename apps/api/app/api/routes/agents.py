from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.agents.base import AgentRequest, AgentStreamEvent, AgentsChatResponse
from app.agents.orchestrator import EducationAgentOrchestrator
from app.db.session import get_db
from app.auth.dependencies import authorize_learning_scope, optional_current_account
from app.auth.models import AuthAccount
from app.core.config import get_settings
from app.preferences.providers import account_llm_provider
from app.companion.service import CompanionService, CompanionThreadNotFound
from fastapi import HTTPException

router = APIRouter(prefix="/agents", tags=["agents"])
logger = logging.getLogger(__name__)


def _authorized_memories(
    payload: AgentRequest,
    db: Session,
    account: AuthAccount | None,
) -> list[str]:
    authorize_learning_scope(account, payload.learner_id, payload.course_id)
    if not payload.thread_id or account is None:
        return []
    try:
        thread = CompanionService(db).get(account, payload.thread_id)
    except CompanionThreadNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if thread.course_id != payload.course_id:
        raise HTTPException(status_code=403, detail="companion thread course scope denied")
    return [item.content for item in thread.memories]


def _sse(event: str, payload: dict) -> str:
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    return f"event: {event}\ndata: {encoded}\n\n"


def _answer_chunks(answer: str, size: int = 24) -> list[str]:
    return [answer[index : index + size] for index in range(0, len(answer), size)]


async def _stream_agent_response(
    orchestrator: EducationAgentOrchestrator,
    payload: AgentRequest,
    memories: list[str],
) -> AsyncIterator[str]:
    queue: asyncio.Queue[tuple[str, object]] = asyncio.Queue(maxsize=64)

    def receive_progress(event: AgentStreamEvent) -> None:
        queue.put_nowait(("progress", event))

    async def run() -> None:
        try:
            result = await orchestrator.handle(
                payload,
                memories=memories,
                event_sink=receive_progress,
            )
        except Exception:
            logger.exception("agent stream failed")
            await queue.put(("error", None))
        else:
            await queue.put(("result", result))

    task = asyncio.create_task(run())
    try:
        while True:
            try:
                kind, value = await asyncio.wait_for(queue.get(), timeout=15)
            except TimeoutError:
                yield ": keep-alive\n\n"
                continue

            if kind == "progress":
                event = value
                if not isinstance(event, AgentStreamEvent):
                    continue
                event_payload = event.model_dump(
                    mode="json",
                    exclude={"kind"},
                )
                if event.kind == "status":
                    event_payload.pop("item", None)
                yield _sse(
                    event.kind,
                    event_payload,
                )
                continue

            if kind == "error":
                yield _sse(
                    "error",
                    {"message": "小涟暂时无法完成回答，请稍后重试。"},
                )
                yield _sse("done", {"ok": False})
                break

            result = value
            if not isinstance(result, AgentsChatResponse):
                yield _sse("error", {"message": "回答结果格式无效。"})
                yield _sse("done", {"ok": False})
                break
            for index, chunk in enumerate(_answer_chunks(result.answer)):
                yield _sse("delta", {"index": index, "text": chunk})
                await asyncio.sleep(0)
            yield _sse("result", result.model_dump(mode="json"))
            yield _sse("done", {"ok": True})
            break
    except asyncio.CancelledError:
        task.cancel()
        raise
    finally:
        if not task.done():
            task.cancel()
        await asyncio.gather(task, return_exceptions=True)


@router.post("/chat", response_model=AgentsChatResponse)
async def chat(
    payload: AgentRequest,
    db: Session = Depends(get_db),
    account: AuthAccount | None = Depends(optional_current_account),
) -> AgentsChatResponse:
    memories = _authorized_memories(payload, db, account)
    return await EducationAgentOrchestrator(
        db, llm_provider=account_llm_provider(db, get_settings(), account)
    ).handle(payload, memories=memories)


@router.post("/chat/stream")
async def chat_stream(
    payload: AgentRequest,
    db: Session = Depends(get_db),
    account: AuthAccount | None = Depends(optional_current_account),
) -> StreamingResponse:
    memories = _authorized_memories(payload, db, account)
    orchestrator = EducationAgentOrchestrator(
        db,
        llm_provider=account_llm_provider(db, get_settings(), account),
    )
    return StreamingResponse(
        _stream_agent_response(orchestrator, payload, memories),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )
