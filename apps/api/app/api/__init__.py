"""API 路由聚合。"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import (
    assessment,
    diagnosis,
    health,
    learning,
    plans,
    practice,
    profile,
    reports,
    tutor,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(profile.router)
api_router.include_router(diagnosis.router)
api_router.include_router(plans.router)
api_router.include_router(learning.router)
api_router.include_router(practice.router)
api_router.include_router(assessment.router)
api_router.include_router(reports.router)
api_router.include_router(tutor.router)
