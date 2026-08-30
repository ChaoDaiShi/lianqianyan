from __future__ import annotations

from sqlalchemy.orm import Session

from app.auth.models import AuthAccount
from app.core.config import Settings
from app.llm import BaseLLMProvider, get_llm_provider
from app.llm.openai_compatible_provider import OpenAICompatibleProvider
from app.preferences.service import ModelProfileService


def account_llm_provider(
    db: Session,
    settings: Settings,
    account: AuthAccount | None,
) -> BaseLLMProvider:
    if account is None:
        return get_llm_provider()
    service = ModelProfileService(db, settings)
    profile = service.selected_profile(account, "llm")
    if profile is None:
        return get_llm_provider()
    return OpenAICompatibleProvider(
        profile.base_url,
        service.api_key(profile) or "",
        profile.model or "",
        settings.llm_timeout,
    )
