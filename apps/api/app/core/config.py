"""Application configuration."""

from __future__ import annotations

from functools import lru_cache

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

    model_config = SettingsConfigDict(env_prefix="EDUCATION_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
