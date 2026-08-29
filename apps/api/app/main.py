"""EducationMind —— 忆涟千言—教 教育领域 FastAPI 应用入口。

提供课程、画像、诊断、计划、学习、评估、考试、资源与智能体 API。

运行：
    uv run uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from collections.abc import Callable

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
from app.preferences import models as preference_models  # noqa: F401 - register settings tables
from app.remote_mcp import models as remote_mcp_models  # noqa: F401 - register token table
from app.remote_mcp.server import MCPBearerAuthApp, create_remote_mcp
from app.voice.genie_embedded import EmbeddedGenieTTSProvider
from app.voice.genie_runtime import GenieRuntime, GenieRuntimeSettings

logger = logging.getLogger(__name__)


def create_app(
    *,
    voice_runtime_factory: Callable[[GenieRuntimeSettings], GenieRuntime] = GenieRuntime,
) -> FastAPI:
    settings = get_settings()
    remote_mcp = create_remote_mcp(settings)
    remote_mcp_app = remote_mcp.streamable_http_app()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            seed_catalog_data(db)
            seed_exam_data(db)
        app.state.voice_provider = None
        if settings.tts_provider == "genie" and settings.tts_configured():
            try:
                runtime_settings = GenieRuntimeSettings.from_application_settings(
                    settings
                )
                runtime = voice_runtime_factory(runtime_settings)
                await asyncio.to_thread(runtime.start)
                app.state.voice_provider = EmbeddedGenieTTSProvider(runtime)
            except Exception:
                logger.exception("Embedded Genie-TTS runtime failed to start")
        async with remote_mcp.session_manager.run():
            yield

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
    application.mount("/mcp", MCPBearerAuthApp(remote_mcp_app), name="educationmind-mcp")
    web_dist_dir = settings.existing_web_dist_dir()
    if web_dist_dir is not None:
        application.mount(
            "/",
            StaticFiles(directory=web_dist_dir, html=True),
            name="educationmind-web",
        )
    return application


app = create_app()
