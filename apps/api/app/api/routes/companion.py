from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import authorize_learning_scope, require_current_account
from app.auth.models import AuthAccount
from app.companion.schemas import (
    CompanionMemoryCreate,
    CompanionMessageCreate,
    CompanionThreadCreate,
    CompanionThreadOut,
)
from app.companion.service import CompanionService, CompanionThreadNotFound
from app.db.session import get_db

router = APIRouter(prefix="/companion/threads", tags=["companion"])


def _service(db: Session = Depends(get_db)) -> CompanionService:
    return CompanionService(db)


def _not_found(exc: CompanionThreadNotFound) -> HTTPException:
    return HTTPException(status_code=404, detail=str(exc))


@router.get("", response_model=list[CompanionThreadOut])
def list_threads(
    course_id: str,
    account: AuthAccount = Depends(require_current_account),
    service: CompanionService = Depends(_service),
) -> list[CompanionThreadOut]:
    authorize_learning_scope(account, account.id, course_id)
    return service.list(account, course_id)


@router.post("", response_model=CompanionThreadOut, status_code=201)
def create_thread(
    payload: CompanionThreadCreate,
    account: AuthAccount = Depends(require_current_account),
    service: CompanionService = Depends(_service),
) -> CompanionThreadOut:
    authorize_learning_scope(account, account.id, payload.course_id)
    return service.create(account, payload)


@router.get("/{thread_id}", response_model=CompanionThreadOut)
def get_thread(
    thread_id: str,
    account: AuthAccount = Depends(require_current_account),
    service: CompanionService = Depends(_service),
) -> CompanionThreadOut:
    try:
        thread = service.get(account, thread_id)
    except CompanionThreadNotFound as exc:
        raise _not_found(exc) from exc
    authorize_learning_scope(account, account.id, thread.course_id)
    return thread


@router.post("/{thread_id}/messages", response_model=CompanionThreadOut)
def append_message(
    thread_id: str,
    payload: CompanionMessageCreate,
    account: AuthAccount = Depends(require_current_account),
    service: CompanionService = Depends(_service),
) -> CompanionThreadOut:
    try:
        return service.append_message(account, thread_id, payload)
    except CompanionThreadNotFound as exc:
        raise _not_found(exc) from exc


@router.post("/{thread_id}/memories", response_model=CompanionThreadOut)
def add_memory(
    thread_id: str,
    payload: CompanionMemoryCreate,
    account: AuthAccount = Depends(require_current_account),
    service: CompanionService = Depends(_service),
) -> CompanionThreadOut:
    try:
        return service.add_memory(account, thread_id, payload)
    except CompanionThreadNotFound as exc:
        raise _not_found(exc) from exc


@router.delete("/{thread_id}/memories/{memory_id}", response_model=CompanionThreadOut)
def delete_memory(
    thread_id: str,
    memory_id: str,
    account: AuthAccount = Depends(require_current_account),
    service: CompanionService = Depends(_service),
) -> CompanionThreadOut:
    try:
        return service.delete_memory(account, thread_id, memory_id)
    except CompanionThreadNotFound as exc:
        raise _not_found(exc) from exc


@router.delete("/{thread_id}", status_code=204)
def delete_thread(
    thread_id: str,
    account: AuthAccount = Depends(require_current_account),
    service: CompanionService = Depends(_service),
) -> Response:
    try:
        service.delete(account, thread_id)
    except CompanionThreadNotFound as exc:
        raise _not_found(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
