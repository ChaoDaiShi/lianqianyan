from __future__ import annotations

import contextvars
import warnings
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from pydantic_settings.sources.utils import IncompleteFieldDefinitionWarning

from app.core.config import Settings
from app.db.session import SessionLocal
from app.remote_mcp.tokens import MCPTokenService
from app.tools import build_tool_registry


@dataclass(frozen=True)
class MCPAccountScope:
    account_id: str
    course_id: str


_scope: contextvars.ContextVar[MCPAccountScope | None] = contextvars.ContextVar(
    "educationmind_mcp_scope", default=None
)


def _execute(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    scope = _scope.get()
    if scope is None:
        raise RuntimeError("MCP account scope is unavailable")
    scoped = dict(arguments)
    scoped["course_id"] = scope.course_id
    if name != "search_course_knowledge":
        scoped["learner_id"] = scope.account_id
    with SessionLocal() as db:
        return build_tool_registry(db).execute(name, scoped).model_dump(mode="json")


def create_remote_mcp(settings: Settings) -> FastMCP:
    hosts = settings.allowed_mcp_hosts()
    # MCP 1.x currently triggers one pydantic-settings forward-reference warning
    # while materializing FastMCP's internal settings. It is upstream-only and does
    # not affect this application's validated Settings model.
    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            category=IncompleteFieldDefinitionWarning,
            module=r"pydantic_settings\.sources\.utils",
        )
        server = FastMCP(
            "educationmind-account-tools",
            instructions="Account-scoped EducationMind learning tools.",
            stateless_http=True,
            json_response=True,
            streamable_http_path="/",
            transport_security=TransportSecuritySettings(
                allowed_hosts=hosts,
                allowed_origins=settings.allowed_cors_origins(),
            ),
        )

    @server.tool(description="Read the authenticated learner profile for the selected course.")
    def get_learner_profile() -> dict[str, Any]:
        return _execute("get_learner_profile", {})

    @server.tool(description="Read the authenticated learner diagnosis for the selected course.")
    def get_learning_diagnosis() -> dict[str, Any]:
        return _execute("get_learning_diagnosis", {})

    @server.tool(description="Read the current study plan for the authenticated learner.")
    def get_current_study_plan() -> dict[str, Any]:
        return _execute("get_current_study_plan", {})

    @server.tool(description="Search the authenticated account's selected course knowledge.")
    def search_course_knowledge(
        query: str,
        knowledge_point_id: str | None = None,
        top_k: int = 4,
    ) -> dict[str, Any]:
        return _execute(
            "search_course_knowledge",
            {"query": query, "knowledge_point_id": knowledge_point_id, "top_k": top_k},
        )

    @server.tool(description="Read recent learning evidence for the authenticated learner.")
    def get_recent_learning_evidence(limit: int = 5) -> dict[str, Any]:
        return _execute("get_recent_learning_evidence", {"limit": limit})

    @server.tool(description="Generate and persist a study plan for the authenticated learner.")
    def generate_study_plan() -> dict[str, Any]:
        return _execute("generate_study_plan", {})

    @server.tool(description="Rebuild the authenticated learner's current study plan.")
    def replan_study_plan() -> dict[str, Any]:
        return _execute("replan_study_plan", {})

    return server


class MCPBearerAuthApp:
    def __init__(self, app: Callable[..., Awaitable[None]]) -> None:
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return
        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        authorization = headers.get(b"authorization", b"").decode("latin-1")
        raw = authorization[7:].strip() if authorization.lower().startswith("bearer ") else ""
        authenticated = None
        if raw:
            with SessionLocal() as db:
                authenticated = MCPTokenService(db).authenticate(raw)
        if authenticated is None:
            body = b'{"error":"invalid or missing MCP access token"}'
            await send({"type": "http.response.start", "status": 401, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
            await send({"type": "http.response.body", "body": body})
            return
        token = _scope.set(MCPAccountScope(*authenticated))
        try:
            await self.app(scope, receive, send)
        finally:
            _scope.reset(token)
