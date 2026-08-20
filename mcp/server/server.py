from __future__ import annotations

import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
API_ROOT = ROOT / "apps" / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from mcp import types
from mcp.server import Server
from mcp.server.stdio import stdio_server

from app.core.seed import seed_demo_data
from app.db.session import SessionLocal, engine
from app.domain import Base
from app.tools import ToolError, ToolResult, build_tool_registry

TOOL_TIMEOUT_SECONDS = 30
logger = logging.getLogger("educationmind.mcp")
logging.basicConfig(stream=sys.stderr, level=logging.INFO)
server = Server("educationmind-tools", version="1.0.0")


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)


def list_registry_tools() -> list[types.Tool]:
    with SessionLocal() as db:
        definitions = build_tool_registry(db).list_tools()
    return [
        types.Tool(
            name=item.name,
            description=item.description,
            inputSchema=item.input_schema,
            annotations=types.ToolAnnotations(
                readOnlyHint=item.read_only,
                destructiveHint=not item.read_only,
                idempotentHint=item.read_only,
                openWorldHint=False,
            ),
        )
        for item in definitions
    ]


def execute_registry_tool(name: str, arguments: dict[str, Any]) -> ToolResult:
    with SessionLocal() as db:
        return build_tool_registry(db).execute(name, arguments)


@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return list_registry_tools()


@server.call_tool(validate_input=False)
async def call_tool(name: str, arguments: dict[str, Any]) -> types.CallToolResult:
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(execute_registry_tool, name, arguments),
            timeout=TOOL_TIMEOUT_SECONDS,
        )
    except TimeoutError:
        result = ToolResult(
            success=False,
            error=ToolError(
                code="TOOL_TIMEOUT",
                message="The education tool exceeded the 30 second time limit.",
            ),
        )
    payload = result.model_dump(mode="json")
    return types.CallToolResult(
        content=[
            types.TextContent(
                type="text",
                text=json.dumps(payload, ensure_ascii=False),
            )
        ],
        structuredContent=payload,
        isError=not result.success,
    )


async def run() -> None:
    initialize_database()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(run())
