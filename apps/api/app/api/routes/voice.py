from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.auth.dependencies import current_account_if_required, optional_current_account
from app.auth.models import AuthAccount
from app.core.config import Settings, get_settings
from app.voice.gpt_sovits import VoiceNotConfiguredError, VoiceProviderError
from app.voice.models import VoiceStatus, VoiceSynthesisRequest
from app.voice.provider import VoiceSynthesisProvider, create_voice_provider
from app.voice.status import get_voice_status
from app.db.session import get_db
from app.preferences.providers import account_voice_provider
from app.preferences.service import ModelProfileService
from sqlalchemy.orm import Session

router = APIRouter(prefix="/voice", tags=["voice"])


def get_voice_provider(
    request: Request,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
    account: AuthAccount | None = Depends(optional_current_account),
) -> VoiceSynthesisProvider:
    return account_voice_provider(
        db,
        settings,
        account,
        embedded_provider=getattr(request.app.state, "voice_provider", None),
    )


@router.get("/status", response_model=VoiceStatus)
def voice_status(
    request: Request,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
    account: AuthAccount | None = Depends(optional_current_account),
) -> VoiceStatus:
    if account is not None and ModelProfileService(db, settings).selected_profile(account, "tts") is not None:
        return VoiceStatus(provider="account_tts", configured=True)
    return get_voice_status(
        settings,
        genie_ready=getattr(request.app.state, "voice_provider", None) is not None,
    )


@router.post(
    "/synthesize",
    dependencies=[Depends(current_account_if_required)],
)
async def synthesize_voice(
    request: VoiceSynthesisRequest,
    provider: VoiceSynthesisProvider = Depends(get_voice_provider),
) -> Response:
    try:
        audio = await provider.synthesize(request.text)
    except VoiceNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except VoiceProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return Response(
        content=audio.content,
        media_type=audio.media_type,
        headers={
            "Cache-Control": "no-store",
            "X-Voice-Provider": provider.provider_name.replace("_", "-"),
        },
    )
