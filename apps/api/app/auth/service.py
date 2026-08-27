from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.models import AuthAccount, AuthSession
from app.auth.passwords import hash_password, verify_password
from app.auth.schemas import RegisterRequest, normalize_username
from app.core.config import Settings
from app.core.time import utc_now
from app.domain.models import Course, User


class UsernameExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AccountLockedError(Exception):
    pass


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


class AuthService:
    def __init__(self, db: Session, settings: Settings):
        self.db = db
        self.settings = settings

    def register(self, payload: RegisterRequest) -> tuple[AuthAccount, str]:
        if self.db.scalar(
            select(AuthAccount).where(AuthAccount.username == payload.username)
        ) is not None:
            raise UsernameExistsError
        account = AuthAccount(
            id=str(uuid.uuid4()),
            username=payload.username,
            display_name=payload.display_name,
            password_hash=hash_password(payload.password),
        )
        self.db.add(account)
        self.db.add(User(id=account.id, name=account.display_name))
        try:
            self.db.flush()
        except IntegrityError as error:
            self.db.rollback()
            raise UsernameExistsError from error
        token = self._create_session(account.id)
        self.db.commit()
        self.db.refresh(account)
        return account, token

    def login(self, username: str, password: str) -> tuple[AuthAccount, str]:
        normalized = normalize_username(username)
        account = self.db.scalar(
            select(AuthAccount).where(AuthAccount.username == normalized)
        )
        now = utc_now()
        if account is not None and account.locked_until and account.locked_until > now:
            raise AccountLockedError
        if account is None or not verify_password(password, account.password_hash):
            if account is not None:
                account.failed_login_attempts += 1
                if account.failed_login_attempts >= 5:
                    account.locked_until = now + timedelta(minutes=15)
                self.db.commit()
            raise InvalidCredentialsError
        account.failed_login_attempts = 0
        account.locked_until = None
        token = self._create_session(account.id)
        self.db.commit()
        self.db.refresh(account)
        return account, token

    def _create_session(self, account_id: str) -> str:
        token = secrets.token_urlsafe(32)
        self.db.add(
            AuthSession(
                id=str(uuid.uuid4()),
                account_id=account_id,
                token_hash=token_digest(token),
                expires_at=utc_now() + timedelta(days=self.settings.auth_session_days),
            )
        )
        return token

    def account_for_token(self, token: str | None) -> AuthAccount | None:
        if not token:
            return None
        now = utc_now()
        session = self.db.scalar(
            select(AuthSession).where(
                AuthSession.token_hash == token_digest(token),
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > now,
            )
        )
        return self.db.get(AuthAccount, session.account_id) if session else None

    def revoke(self, token: str | None) -> None:
        if token:
            session = self.db.scalar(
                select(AuthSession).where(AuthSession.token_hash == token_digest(token))
            )
            if session and session.revoked_at is None:
                session.revoked_at = utc_now()
                self.db.commit()

    def select_course(self, account: AuthAccount, course_id: str) -> AuthAccount | None:
        if self.db.get(Course, course_id) is None:
            return None
        account.selected_course_id = course_id
        self.db.commit()
        self.db.refresh(account)
        return account
