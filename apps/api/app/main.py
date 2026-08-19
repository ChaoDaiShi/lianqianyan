"""EducationMind —— 忆涟千言—教 教育领域 FastAPI 应用入口。

第一阶段仅提供最小运行骨架 + 未来 API 路由结构（profile/diagnosis/plans/
learning/practice/assessment/reports）。

运行：
    uv run uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import api_router
from app.core.config import get_settings
from app.core.seed import seed_demo_data
from app.db.session import SessionLocal, engine
from app.domain import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时创建表（不写死 SQLite 特性）+ 写入演示 Seed。
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="忆涟千言—教 EducationMind",
        description="基于学习画像、学习证据与动态学习规划的个性化 AI 学习伙伴 —— 第一阶段骨架",
        version=settings.app_version,
        lifespan=lifespan,
    )
    application.include_router(api_router)
    return application


app = create_app()
