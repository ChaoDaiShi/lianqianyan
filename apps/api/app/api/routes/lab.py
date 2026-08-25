from __future__ import annotations

from fastapi import APIRouter

from app.lab import (
    CompileSimulationRequest,
    CompileSimulationResponse,
    TeachingCompilerSimulator,
)

router = APIRouter(prefix="/lab", tags=["learning-lab"])


@router.post("/compile-simulate", response_model=CompileSimulationResponse)
def compile_simulate(payload: CompileSimulationRequest) -> CompileSimulationResponse:
    return TeachingCompilerSimulator().simulate(payload)
