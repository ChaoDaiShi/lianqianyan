from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[2]


async def smoke() -> None:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT / "apps" / "api")
    parameters = StdioServerParameters(
        command=sys.executable,
        args=["mcp/server/server.py"],
        cwd=str(ROOT),
        env=env,
    )
    async with stdio_client(parameters) as (read, write):
        async with ClientSession(read, write) as session:
            initialized = await session.initialize()
            catalog = await session.list_tools()
            diagnosis = await session.call_tool(
                "get_learning_diagnosis",
                {"learner_id": "demo-user-001", "course_id": "course-os"},
            )

    payload = diagnosis.structuredContent or {}
    if diagnosis.isError or not payload.get("success"):
        raise RuntimeError("get_learning_diagnosis MCP smoke call failed")
    print(
        json.dumps(
            {
                "server": initialized.serverInfo.name,
                "tools": [tool.name for tool in catalog.tools],
                "diagnosis_primary_focus": payload["data"]["primary_focus"][
                    "knowledge_point_id"
                ],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    asyncio.run(smoke())
