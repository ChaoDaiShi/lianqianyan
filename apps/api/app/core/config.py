"""Application configuration."""

from __future__ import annotations

from functools import lru_cache
from urllib.parse import urlsplit

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed application configuration."""

    app_name: str = "education-api"
    app_version: str = "0.1.0"
    database_url: str = "sqlite:///./education.db"
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None
    llm_timeout: float = 20.0
    tts_provider: str = "gpt_sovits"
    tts_base_url: str | None = None
    tts_reference_audio_path: str | None = None
    tts_reference_text: str | None = None
    tts_timeout: float = 60.0
    tts_max_audio_bytes: int = 20_000_000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_prefix="EDUCATION_", env_file=".env", extra="ignore")

    def allowed_cors_origins(self) -> list[str]:
        """Return unique, absolute HTTP(S) origins from the environment allowlist."""
        origins: list[str] = []
        for raw_value in self.cors_origins.split(","):
            candidate = raw_value.strip().rstrip("/")
            if not candidate or candidate == "*":
                continue
            parsed = urlsplit(candidate)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.username
                or parsed.password
                or parsed.path
                or parsed.query
                or parsed.fragment
            ):
                continue
            normalized = f"{parsed.scheme}://{parsed.netloc}"
            if normalized not in origins:
                origins.append(normalized)
        return origins

    def normalized_tts_base_url(self) -> str | None:
        """Return a safe absolute TTS service URL from server config."""
        candidate = (self.tts_base_url or "").strip().rstrip("/")
        if not candidate:
            return None
        parsed = urlsplit(candidate)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            return None
        return candidate

    def tts_configured(self) -> bool:
        """Require the server-owned values needed by the selected TTS provider."""
        if not self.normalized_tts_base_url():
            return False
        if self.tts_provider == "genie":
            return True
        if self.tts_provider != "gpt_sovits":
            return False
        return bool(
            (self.tts_reference_audio_path or "").strip()
            and (self.tts_reference_text or "").strip()
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
