from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth.dependencies import current_account_if_required
from app.core.config import Settings, get_settings
from app.voice.errors import VoiceNotConfiguredError, VoiceProviderError
from app.voice.models import VoiceStatus, VoiceSynthesisRequest
from app.voice.provider import VoiceSynthesisProvider, create_voice_provider
from app.voice.status import get_voice_status

router = APIRouter(prefix="/voice", tags=["voice"])


def get_voice_provider(
    settings: Settings = Depends(get_settings),
) -> VoiceSynthesisProvider:
    return create_voice_provider(settings)


@router.get("/status", response_model=VoiceStatus)
def voice_status(
    settings: Settings = Depends(get_settings),
) -> VoiceStatus:
    return get_voice_status(settings)


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
