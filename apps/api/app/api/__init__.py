"""API 路由聚合。"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth.dependencies import current_account_if_required

from app.api.routes import (
    agents,
    auth,
    assessment,
    diagnosis,
    exams,
    health,
    knowledge,
    lab,
    learning,
    network,
    plans,
    practice,
    public,
    profile,
    reports,
    resources,
    settings,
    system,
    tools,
    tutor,
    voice,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(public.router)
api_router.include_router(auth.router)
api_router.include_router(voice.router)
_protected = [Depends(current_account_if_required)]
api_router.include_router(system.router, dependencies=_protected)
api_router.include_router(settings.router, dependencies=_protected)
api_router.include_router(tools.router, dependencies=_protected)
api_router.include_router(knowledge.router, dependencies=_protected)
api_router.include_router(network.router, dependencies=_protected)
api_router.include_router(lab.router, dependencies=_protected)
api_router.include_router(resources.router, dependencies=_protected)
api_router.include_router(exams.router, dependencies=_protected)
api_router.include_router(profile.router, dependencies=_protected)
api_router.include_router(diagnosis.router, dependencies=_protected)
api_router.include_router(plans.router, dependencies=_protected)
api_router.include_router(learning.router, dependencies=_protected)
api_router.include_router(practice.router, dependencies=_protected)
api_router.include_router(agents.router, dependencies=_protected)
api_router.include_router(assessment.router, dependencies=_protected)
api_router.include_router(reports.router, dependencies=_protected)
api_router.include_router(tutor.router, dependencies=_protected)
