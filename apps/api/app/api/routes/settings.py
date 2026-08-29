from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_current_account
from app.auth.models import AuthAccount
from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.preferences.schemas import (
    AccountSettingsOut,
    ModelProfileCreate,
    ModelProfileOut,
    ModelSelectionUpdate,
    ThemeUpdate,
)
from app.preferences.service import ModelProfileError, ModelProfileService
from app.remote_mcp.tokens import MCPTokenCreate, MCPTokenCreated, MCPTokenOut, MCPTokenService

router = APIRouter(prefix="/settings", tags=["settings"])


def _service(
    db: Session = Depends(get_db), settings: Settings = Depends(get_settings)
) -> ModelProfileService:
    return ModelProfileService(db, settings)


def _bad_request(exc: ModelProfileError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc))


@router.get("", response_model=AccountSettingsOut)
def get_account_settings(
    account: AuthAccount = Depends(require_current_account),
    service: ModelProfileService = Depends(_service),
) -> AccountSettingsOut:
    return service.get(account)


@router.put("/theme", response_model=AccountSettingsOut)
def update_theme(
    payload: ThemeUpdate,
    account: AuthAccount = Depends(require_current_account),
    service: ModelProfileService = Depends(_service),
) -> AccountSettingsOut:
    return service.set_theme(account, payload.theme)


@router.post("/models", response_model=ModelProfileOut, status_code=201)
def create_model_profile(
    payload: ModelProfileCreate,
    account: AuthAccount = Depends(require_current_account),
    service: ModelProfileService = Depends(_service),
) -> ModelProfileOut:
    try:
        return service.create(account, payload)
    except ModelProfileError as exc:
        raise _bad_request(exc) from exc


@router.put("/models/{kind}/selection", response_model=AccountSettingsOut)
def select_model_profile(
    kind: str,
    payload: ModelSelectionUpdate,
    account: AuthAccount = Depends(require_current_account),
    service: ModelProfileService = Depends(_service),
) -> AccountSettingsOut:
    try:
        return service.select(account, kind, payload.profile_id)
    except ModelProfileError as exc:
        raise _bad_request(exc) from exc


@router.delete("/models/{profile_id}", status_code=204)
def delete_model_profile(
    profile_id: str,
    account: AuthAccount = Depends(require_current_account),
    service: ModelProfileService = Depends(_service),
) -> Response:
    try:
        service.delete(account, profile_id)
    except ModelProfileError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=204)


@router.get("/mcp-tokens", response_model=list[MCPTokenOut])
def list_mcp_tokens(
    account: AuthAccount = Depends(require_current_account),
    db: Session = Depends(get_db),
) -> list[MCPTokenOut]:
    return MCPTokenService(db).list(account)


@router.post("/mcp-tokens", response_model=MCPTokenCreated, status_code=201)
def create_mcp_token(
    payload: MCPTokenCreate,
    account: AuthAccount = Depends(require_current_account),
    db: Session = Depends(get_db),
) -> MCPTokenCreated:
    return MCPTokenService(db).create(account, payload.name)


@router.delete("/mcp-tokens/{token_id}", status_code=204)
def revoke_mcp_token(
    token_id: str,
    account: AuthAccount = Depends(require_current_account),
    db: Session = Depends(get_db),
) -> Response:
    if not MCPTokenService(db).revoke(account, token_id):
        raise HTTPException(status_code=404, detail="MCP token not found")
    return Response(status_code=204)
