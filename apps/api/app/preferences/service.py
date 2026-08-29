from __future__ import annotations

import uuid
from urllib.parse import urlsplit

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.models import AuthAccount
from app.core.config import Settings
from app.preferences.models import AccountPreference, ModelProfile
from app.preferences.schemas import (
    AccountSettingsOut,
    ModelProfileCreate,
    ModelProfileOut,
    RuntimeDefaultOut,
    ThemePreference,
)


class ModelProfileError(ValueError):
    pass


class ModelProfileService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings

    def _preferences(self, account_id: str) -> AccountPreference:
        preferences = self.db.get(AccountPreference, account_id)
        if preferences is None:
            preferences = AccountPreference(account_id=account_id, theme="system")
            self.db.add(preferences)
            self.db.flush()
        return preferences

    def _fernet(self) -> Fernet:
        key = (self.settings.model_secret_key or "").strip().encode("ascii")
        if not key:
            raise ModelProfileError("deployment has not configured encrypted model secrets")
        try:
            return Fernet(key)
        except (ValueError, TypeError) as exc:
            raise ModelProfileError("deployment model secret key is invalid") from exc

    def _validate_url(self, raw: str) -> str:
        candidate = raw.strip().rstrip("/")
        parsed = urlsplit(candidate)
        allowed_schemes = {"https"}
        if self.settings.custom_model_allow_http:
            allowed_schemes.add("http")
        if (
            parsed.scheme not in allowed_schemes
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise ModelProfileError("model endpoint must be an allowed absolute HTTP(S) URL")
        allowed_hosts = self.settings.allowed_custom_model_hosts()
        if parsed.hostname.casefold() not in allowed_hosts:
            raise ModelProfileError("model endpoint host is not allowed by this deployment")
        return candidate

    @staticmethod
    def _out(profile: ModelProfile) -> ModelProfileOut:
        return ModelProfileOut(
            id=profile.id,
            name=profile.name,
            kind=profile.kind,
            provider=profile.provider,
            base_url=profile.base_url,
            model=profile.model,
            voice=profile.voice,
            has_api_key=bool(profile.api_key_encrypted),
            created_at=profile.created_at,
        )

    def get(self, account: AuthAccount) -> AccountSettingsOut:
        preferences = self._preferences(account.id)
        profiles = list(
            self.db.scalars(
                select(ModelProfile)
                .where(ModelProfile.account_id == account.id)
                .order_by(ModelProfile.created_at, ModelProfile.name)
            ).all()
        )
        self.db.commit()
        return AccountSettingsOut(
            theme=preferences.theme,
            selected_llm_profile_id=preferences.selected_llm_profile_id,
            selected_tts_profile_id=preferences.selected_tts_profile_id,
            profiles=[self._out(item) for item in profiles],
            default_llm=RuntimeDefaultOut(
                configured=self.settings.llm_configured(),
                provider="openai_chat" if self.settings.llm_configured() else "unavailable",
                model=(self.settings.llm_model or "").strip() or None,
            ),
            default_tts=RuntimeDefaultOut(
                configured=self.settings.tts_configured(),
                provider=self.settings.tts_provider if self.settings.tts_configured() else "unavailable",
                model=None,
            ),
            custom_model_hosts=sorted(self.settings.allowed_custom_model_hosts()),
            secret_storage_configured=bool((self.settings.model_secret_key or "").strip()),
        )

    def set_theme(self, account: AuthAccount, theme: ThemePreference) -> AccountSettingsOut:
        self._preferences(account.id).theme = theme
        self.db.commit()
        return self.get(account)

    def create(self, account: AuthAccount, payload: ModelProfileCreate) -> ModelProfileOut:
        valid_pairs = {
            ("llm", "openai_chat"),
            ("tts", "openai_speech"),
            ("tts", "gpt_sovits"),
        }
        if (payload.kind, payload.provider) not in valid_pairs:
            raise ModelProfileError("model kind and provider do not match")
        if payload.provider in {"openai_chat", "openai_speech"} and not payload.model:
            raise ModelProfileError("this provider requires a model name")
        if payload.provider == "gpt_sovits" and not payload.voice:
            raise ModelProfileError("GPT-SoVITS requires an upstream reference audio path")
        encrypted = None
        if payload.api_key:
            encrypted = self._fernet().encrypt(payload.api_key.encode("utf-8")).decode("ascii")
        profile = ModelProfile(
            id=str(uuid.uuid4()),
            account_id=account.id,
            name=payload.name,
            kind=payload.kind,
            provider=payload.provider,
            base_url=self._validate_url(payload.base_url),
            model=payload.model,
            voice=payload.voice,
            api_key_encrypted=encrypted,
        )
        self.db.add(profile)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ModelProfileError("a model profile with this name already exists") from exc
        self.db.refresh(profile)
        return self._out(profile)

    def select(self, account: AuthAccount, kind: str, profile_id: str | None) -> AccountSettingsOut:
        if kind not in {"llm", "tts"}:
            raise ModelProfileError("unknown model kind")
        if profile_id is not None:
            profile = self.db.get(ModelProfile, profile_id)
            if profile is None or profile.account_id != account.id or profile.kind != kind:
                raise ModelProfileError("model profile is not available for this account")
        preferences = self._preferences(account.id)
        if kind == "llm":
            preferences.selected_llm_profile_id = profile_id
        else:
            preferences.selected_tts_profile_id = profile_id
        self.db.commit()
        return self.get(account)

    def delete(self, account: AuthAccount, profile_id: str) -> None:
        profile = self.db.get(ModelProfile, profile_id)
        if profile is None or profile.account_id != account.id:
            raise ModelProfileError("model profile not found")
        preferences = self._preferences(account.id)
        if preferences.selected_llm_profile_id == profile_id:
            preferences.selected_llm_profile_id = None
        if preferences.selected_tts_profile_id == profile_id:
            preferences.selected_tts_profile_id = None
        self.db.delete(profile)
        self.db.commit()

    def selected_profile(self, account: AuthAccount, kind: str) -> ModelProfile | None:
        preferences = self._preferences(account.id)
        profile_id = (
            preferences.selected_llm_profile_id if kind == "llm" else preferences.selected_tts_profile_id
        )
        if not profile_id:
            return None
        profile = self.db.get(ModelProfile, profile_id)
        return profile if profile and profile.account_id == account.id and profile.kind == kind else None

    def api_key(self, profile: ModelProfile) -> str | None:
        if not profile.api_key_encrypted:
            return None
        try:
            return self._fernet().decrypt(profile.api_key_encrypted.encode("ascii")).decode("utf-8")
        except InvalidToken as exc:
            raise ModelProfileError("stored model secret cannot be decrypted") from exc
