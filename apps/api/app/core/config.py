"""Application configuration."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


API_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
DEFAULT_DATABASE_PATH = API_ENV_FILE.parent / "education.db"
DEFAULT_DATABASE_URL = f"sqlite:///{DEFAULT_DATABASE_PATH.resolve().as_posix()}"


def _anchor_relative_sqlite_url(value: str) -> str:
    url = make_url(value)
    if not url.drivername.startswith("sqlite") or not url.database or url.database == ":memory:":
        return value

    database_path = Path(url.database)
    if database_path.is_absolute():
        return value

    anchored_path = (API_ENV_FILE.parent / database_path).resolve()
    return url.set(database=anchored_path.as_posix()).render_as_string()


class Settings(BaseSettings):
    """Environment-backed application configuration."""

    app_name: str = "education-api"
    app_version: str = "0.1.0"
    database_url: str = DEFAULT_DATABASE_URL
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None
    llm_timeout: float = 20.0
    model_secret_key: str | None = None
    custom_model_hosts: str = ""
    custom_model_allow_http: bool = False
    tts_provider: str = "genie"
    tts_base_url: str | None = None
    tts_genie_root: str | None = None
    tts_model_dir: str | None = None
    tts_genie_data_dir: str | None = None
    tts_reference_audio_path: str | None = None
    tts_reference_text: str | None = None
    tts_timeout: float = 60.0
    tts_max_audio_bytes: int = 20_000_000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    web_dist_dir: str | None = None
    auth_required: bool = True
    auth_session_days: int = 7
    auth_cookie_name: str = "educationmind_session"
    auth_cookie_secure: bool = False
    turnstile_site_key: str | None = None
    turnstile_secret_key: str | None = None
    turnstile_timeout: float = 5.0
    mcp_public_base_url: str | None = None
    mcp_allowed_hosts: str = "localhost:*,127.0.0.1:*,testserver"

    model_config = SettingsConfigDict(
        env_prefix="EDUCATION_",
        env_file=API_ENV_FILE,
        extra="ignore",
    )

    @field_validator("database_url")
    @classmethod
    def anchor_database_url(cls, value: str) -> str:
        return _anchor_relative_sqlite_url(value)

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

    def allowed_custom_model_hosts(self) -> set[str]:
        return {
            host.strip().casefold()
            for host in self.custom_model_hosts.split(",")
            if host.strip()
        }

    def llm_configured(self) -> bool:
        return all(
            (value or "").strip()
            for value in (self.llm_base_url, self.llm_api_key, self.llm_model)
        )

    def turnstile_configured(self) -> bool:
        return bool(
            (self.turnstile_site_key or "").strip()
            and (self.turnstile_secret_key or "").strip()
        )

    def allowed_mcp_hosts(self) -> list[str]:
        return [item.strip() for item in self.mcp_allowed_hosts.split(",") if item.strip()]

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
        if self.tts_provider == "genie":
            return bool(
                (self.tts_genie_root or "").strip()
                and (self.tts_model_dir or "").strip()
                and (self.tts_genie_data_dir or "").strip()
                and (self.tts_reference_audio_path or "").strip()
                and (self.tts_reference_text or "").strip()
            )
        if self.tts_provider != "gpt_sovits":
            return False
        return bool(
            self.normalized_tts_base_url()
            and
            (self.tts_reference_audio_path or "").strip()
            and (self.tts_reference_text or "").strip()
        )

    def existing_web_dist_dir(self) -> Path | None:
        """Return an explicitly configured static build directory when it exists."""
        candidate = (self.web_dist_dir or "").strip()
        if not candidate:
            return None
        directory = Path(candidate)
        if not directory.is_absolute() or not directory.is_dir():
            return None
        if not (directory / "index.html").is_file():
            return None
        return directory.resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
