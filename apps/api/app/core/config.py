"""核心配置模块。"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置。

    未来可通过环境变量覆盖（如从 SQLite 迁移到 PostgreSQL 时设置
    DATABASE_URL，无需改动业务代码）。
    """

    app_name: str = "education-api"
    app_version: str = "0.1.0"
    # 第一阶段使用 SQLite 文件数据库；迁移到 PostgreSQL/MySQL 时仅需覆盖此变量。
    database_url: str = "sqlite:///./education.db"

    model_config = SettingsConfigDict(env_prefix="EDUCATION_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
