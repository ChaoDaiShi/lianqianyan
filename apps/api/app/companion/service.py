from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import AuthAccount
from app.companion.models import CompanionThread
from app.companion.schemas import (
    CompanionMemoryCreate,
    CompanionMessageCreate,
    CompanionThreadCreate,
    CompanionThreadOut,
)
from app.core.time import utc_now


class CompanionThreadNotFound(LookupError):
    pass


class CompanionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _out(thread: CompanionThread) -> CompanionThreadOut:
        return CompanionThreadOut(
            id=thread.id,
            account_id=thread.account_id,
            course_id=thread.course_id,
            title=thread.title,
            messages=thread.messages or [],
            memories=thread.memories or [],
            message_count=len(thread.messages or []),
            memory_count=len(thread.memories or []),
            created_at=thread.created_at,
            updated_at=thread.updated_at,
        )

    def _thread(self, account: AuthAccount, thread_id: str) -> CompanionThread:
        thread = self.db.get(CompanionThread, thread_id)
        if thread is None or thread.account_id != account.id:
            raise CompanionThreadNotFound("companion thread not found")
        return thread

    def list(self, account: AuthAccount, course_id: str) -> list[CompanionThreadOut]:
        threads = self.db.scalars(
            select(CompanionThread)
            .where(
                CompanionThread.account_id == account.id,
                CompanionThread.course_id == course_id,
            )
            .order_by(CompanionThread.updated_at.desc())
        ).all()
        return [self._out(thread) for thread in threads]

    def create(self, account: AuthAccount, payload: CompanionThreadCreate) -> CompanionThreadOut:
        now = utc_now()
        thread = CompanionThread(
            id=str(uuid.uuid4()),
            account_id=account.id,
            course_id=payload.course_id,
            title=payload.title,
            messages=[],
            memories=[],
            created_at=now,
            updated_at=now,
        )
        self.db.add(thread)
        self.db.commit()
        self.db.refresh(thread)
        return self._out(thread)

    def get(self, account: AuthAccount, thread_id: str) -> CompanionThreadOut:
        return self._out(self._thread(account, thread_id))

    def append_message(
        self,
        account: AuthAccount,
        thread_id: str,
        payload: CompanionMessageCreate,
    ) -> CompanionThreadOut:
        thread = self._thread(account, thread_id)
        item = {
            **payload.model_dump(),
            "id": str(uuid.uuid4()),
            "created_at": utc_now().isoformat(),
        }
        thread.messages = [*(thread.messages or []), item][-200:]
        if len(thread.messages) == 1 and thread.title == "新对话":
            thread.title = payload.content[:28]
        thread.updated_at = utc_now()
        self.db.commit()
        self.db.refresh(thread)
        return self._out(thread)

    def add_memory(
        self,
        account: AuthAccount,
        thread_id: str,
        payload: CompanionMemoryCreate,
    ) -> CompanionThreadOut:
        thread = self._thread(account, thread_id)
        item = {
            **payload.model_dump(),
            "id": str(uuid.uuid4()),
            "created_at": utc_now().isoformat(),
        }
        thread.memories = [item, *(thread.memories or [])][:30]
        thread.updated_at = utc_now()
        self.db.commit()
        self.db.refresh(thread)
        return self._out(thread)

    def delete_memory(
        self, account: AuthAccount, thread_id: str, memory_id: str
    ) -> CompanionThreadOut:
        thread = self._thread(account, thread_id)
        thread.memories = [
            item for item in (thread.memories or []) if item.get("id") != memory_id
        ]
        thread.updated_at = utc_now()
        self.db.commit()
        self.db.refresh(thread)
        return self._out(thread)

    def delete(self, account: AuthAccount, thread_id: str) -> None:
        thread = self._thread(account, thread_id)
        self.db.delete(thread)
        self.db.commit()
