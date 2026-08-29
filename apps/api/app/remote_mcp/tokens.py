from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import AuthAccount
from app.core.time import utc_now
from app.remote_mcp.models import MCPAccessToken


def mcp_token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


class MCPTokenCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class MCPTokenOut(BaseModel):
    id: str
    name: str
    token_prefix: str
    created_at: datetime
    last_used_at: datetime | None


class MCPTokenCreated(MCPTokenOut):
    token: str


class MCPTokenService:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def _out(item: MCPAccessToken) -> MCPTokenOut:
        return MCPTokenOut(
            id=item.id,
            name=item.name,
            token_prefix=item.token_prefix,
            created_at=item.created_at,
            last_used_at=item.last_used_at,
        )

    def list(self, account: AuthAccount) -> list[MCPTokenOut]:
        rows = self.db.scalars(
            select(MCPAccessToken)
            .where(
                MCPAccessToken.account_id == account.id,
                MCPAccessToken.revoked_at.is_(None),
            )
            .order_by(MCPAccessToken.created_at.desc())
        ).all()
        return [self._out(item) for item in rows]

    def create(self, account: AuthAccount, name: str) -> MCPTokenCreated:
        raw = "emcp_" + secrets.token_urlsafe(32)
        item = MCPAccessToken(
            id=str(uuid.uuid4()),
            account_id=account.id,
            name=name.strip(),
            token_hash=mcp_token_digest(raw),
            token_prefix=raw[:12],
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return MCPTokenCreated(**self._out(item).model_dump(), token=raw)

    def revoke(self, account: AuthAccount, token_id: str) -> bool:
        item = self.db.get(MCPAccessToken, token_id)
        if item is None or item.account_id != account.id or item.revoked_at is not None:
            return False
        item.revoked_at = utc_now()
        self.db.commit()
        return True

    def authenticate(self, raw: str) -> tuple[str, str] | None:
        item = self.db.scalar(
            select(MCPAccessToken).where(
                MCPAccessToken.token_hash == mcp_token_digest(raw),
                MCPAccessToken.revoked_at.is_(None),
            )
        )
        if item is None:
            return None
        account = self.db.get(AuthAccount, item.account_id)
        if account is None or account.selected_course_id is None:
            return None
        item.last_used_at = utc_now()
        self.db.commit()
        return account.id, account.selected_course_id
