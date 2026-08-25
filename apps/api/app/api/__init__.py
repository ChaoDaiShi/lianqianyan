"""API 路由聚合。"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import (
    agents,
    assessment,
    diagnosis,
    health,
    knowledge,
    lab,
    learning,
    network,
    plans,
    practice,
    profile,
    reports,
    resources,
    system,
    tools,
    tutor,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(system.router)
api_router.include_router(tools.router)
api_router.include_router(knowledge.router)
api_router.include_router(network.router)
api_router.include_router(lab.router)
api_router.include_router(resources.router)
api_router.include_router(profile.router)
api_router.include_router(diagnosis.router)
api_router.include_router(plans.router)
api_router.include_router(learning.router)
api_router.include_router(practice.router)
api_router.include_router(agents.router)
api_router.include_router(assessment.router)
api_router.include_router(reports.router)
api_router.include_router(tutor.router)
