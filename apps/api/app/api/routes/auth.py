from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_auth_service, require_current_account
from app.auth.models import AuthAccount
from app.auth.schemas import (
    AccountOut,
    CourseOptionOut,
    CourseSelectionRequest,
    LoginRequest,
    RegisterRequest,
    SessionOut,
)
from app.auth.service import (
    AccountLockedError,
    AuthService,
    InvalidCredentialsError,
    UsernameExistsError,
)
from app.auth.turnstile import TurnstileError, TurnstileVerifier, get_turnstile_verifier
from app.core.config import get_settings
from app.db.session import get_db
from app.domain.models import Course

router = APIRouter(prefix="/auth", tags=["auth"])


def _session_out(account: AuthAccount) -> SessionOut:
    return SessionOut(
        account=AccountOut(
            id=account.id,
            username=account.username,
            display_name=account.display_name,
            selected_course_id=account.selected_course_id,
            created_at=account.created_at,
        )
    )


def _set_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        max_age=settings.auth_session_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=SessionOut, status_code=201)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service),
    verifier: TurnstileVerifier = Depends(get_turnstile_verifier),
) -> SessionOut:
    try:
        await verifier.verify(payload.captcha_token, request.client.host if request.client else None)
    except TurnstileError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    try:
        account, token = service.register(payload)
    except UsernameExistsError as error:
        raise HTTPException(status_code=409, detail="username already exists") from error
    _set_cookie(response, token)
    return _session_out(account)


@router.post("/login", response_model=SessionOut)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service),
    verifier: TurnstileVerifier = Depends(get_turnstile_verifier),
) -> SessionOut:
    try:
        await verifier.verify(payload.captcha_token, request.client.host if request.client else None)
    except TurnstileError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    try:
        account, token = service.login(payload.username, payload.password)
    except AccountLockedError as error:
        raise HTTPException(status_code=423, detail="account temporarily locked") from error
    except InvalidCredentialsError as error:
        raise HTTPException(status_code=401, detail="invalid username or password") from error
    _set_cookie(response, token)
    return _session_out(account)


@router.get("/session", response_model=SessionOut)
def session(account: AuthAccount = Depends(require_current_account)) -> SessionOut:
    return _session_out(account)


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service),
) -> None:
    settings = get_settings()
    service.revoke(request.cookies.get(settings.auth_cookie_name))
    response.delete_cookie(settings.auth_cookie_name, path="/")


@router.get("/courses", response_model=list[CourseOptionOut])
def courses(
    _: AuthAccount = Depends(require_current_account),
    db: Session = Depends(get_db),
) -> list[CourseOptionOut]:
    return [
        CourseOptionOut(id=course.id, name=course.name, description=course.description)
        for course in db.scalars(select(Course).order_by(Course.name)).all()
    ]


@router.put("/course", response_model=AccountOut)
def select_course(
    payload: CourseSelectionRequest,
    account: AuthAccount = Depends(require_current_account),
    service: AuthService = Depends(get_auth_service),
) -> AccountOut:
    selected = service.select_course(account, payload.course_id)
    if selected is None:
        raise HTTPException(status_code=404, detail="course not found")
    return _session_out(selected).account
