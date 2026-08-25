from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

CompileStageName = Literal["preprocess", "syntax", "semantic", "link", "run"]
CompileStageStatus = Literal["passed", "failed", "skipped"]
DiagnosticSeverity = Literal["error", "warning"]


class CompileSimulationRequest(BaseModel):
    language: Literal["c-edu"] = "c-edu"
    code: str = Field(min_length=1, max_length=4_000)


class CompileStage(BaseModel):
    name: CompileStageName
    label: str
    status: CompileStageStatus


class CompileDiagnostic(BaseModel):
    stage: CompileStageName
    severity: DiagnosticSeverity
    line: int | None = Field(default=None, ge=1)
    code: str
    message: str


class CompileSimulationResponse(BaseModel):
    success: bool
    language: Literal["c-edu"] = "c-edu"
    mode: Literal["simulation"] = "simulation"
    stages: list[CompileStage]
    diagnostics: list[CompileDiagnostic] = Field(default_factory=list)
    stdout: str = ""
    safety_notice: str = "教学模拟，不执行本机程序或任意系统命令。"
