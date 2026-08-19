"""数据库会话管理。

使用 SQLAlchemy 统一抽象：
- 第一阶段默认 SQLite（配置 database_url）。
- 未来迁移 PostgreSQL/MySQL 仅需覆盖 EDUCATION_DATABASE_URL 环境变量，代码无需改动。
不依赖 SQLite 特有 API。
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI 依赖：提供数据库会话。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
