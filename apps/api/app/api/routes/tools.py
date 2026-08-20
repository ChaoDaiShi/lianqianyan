from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.tools import ToolDefinition, build_tool_registry

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("", response_model=list[ToolDefinition])
def list_education_tools(db: Session = Depends(get_db)) -> list[ToolDefinition]:
    return build_tool_registry(db).list_tools()
