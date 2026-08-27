"""EducationMind —— 忆涟千言—教 教育领域 FastAPI 应用入口。

提供课程、画像、诊断、计划、学习、评估、考试、资源与智能体 API。

运行：
    uv run uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.auth import models as auth_models  # noqa: F401 - register auth tables
from app.core.config import get_settings
from app.core.seed import seed_catalog_data
from app.db.session import SessionLocal, engine
from app.domain import Base
from app.exams import seed_exam_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup creates schema plus shared catalog metadata only.
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_catalog_data(db)
        seed_exam_data(db)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="忆涟千言—教 EducationMind",
        description="基于正式账号、真实学习证据、课程知识与动态学习规划的教育智能体",
        version=settings.app_version,
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(api_router)
    web_dist_dir = settings.existing_web_dist_dir()
    if web_dist_dir is not None:
        application.mount(
            "/",
            StaticFiles(directory=web_dist_dir, html=True),
            name="educationmind-web",
        )
    return application


app = create_app()
