from __future__ import annotations

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth.models import AuthAccount
from app.auth.service import AuthService
from app.core.config import get_settings
from app.db.session import get_db


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db, get_settings())


def optional_current_account(
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> AuthAccount | None:
    settings = get_settings()
    if not settings.auth_required:
        return None
    return service.account_for_token(request.cookies.get(settings.auth_cookie_name))


def require_current_account(
    account: AuthAccount | None = Depends(optional_current_account),
) -> AuthAccount:
    if account is None:
        raise HTTPException(status_code=401, detail="authentication required")
    return account


def current_account_if_required(
    account: AuthAccount | None = Depends(optional_current_account),
) -> AuthAccount | None:
    if get_settings().auth_required and account is None:
        raise HTTPException(status_code=401, detail="authentication required")
    return account


def authorize_learning_scope(
    account: AuthAccount | None,
    learner_id: str,
    course_id: str | None = None,
) -> None:
    if account is None and not get_settings().auth_required:
        return
    if account is None:
        raise HTTPException(status_code=401, detail="authentication required")
    if account.id != learner_id:
        raise HTTPException(status_code=403, detail="learner scope denied")
    if course_id is not None:
        if account.selected_course_id is None:
            raise HTTPException(status_code=409, detail="select a course first")
        if account.selected_course_id != course_id:
            raise HTTPException(status_code=403, detail="course scope denied")
