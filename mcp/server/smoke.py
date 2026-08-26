from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[2]


async def smoke() -> None:
    with TemporaryDirectory(prefix="educationmind-mcp-smoke-") as temp_dir:
        env = os.environ.copy()
        env["PYTHONPATH"] = str(ROOT / "apps" / "api")
        database_path = (Path(temp_dir) / "mcp-smoke.db").as_posix()
        env["EDUCATION_DATABASE_URL"] = f"sqlite:///{database_path}"
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
                    {"learner_id": "anon:mcp-smoke", "course_id": "course-os"},
                )

    payload = diagnosis.structuredContent or {}
    if diagnosis.isError or not payload.get("success"):
        raise RuntimeError("get_learning_diagnosis MCP smoke call failed")
    diagnosis_data = payload["data"]
    if diagnosis_data["primary_focus"] is not None:
        raise RuntimeError("fresh anonymous learner unexpectedly has a primary focus")
    if len(diagnosis_data["unassessed_points"]) != 5:
        raise RuntimeError("fresh anonymous learner catalog is incomplete")
    print(
        json.dumps(
            {
                "server": initialized.serverInfo.name,
                "tools": [tool.name for tool in catalog.tools],
                "learner_id": "anon:mcp-smoke",
                "diagnosis_primary_focus": diagnosis_data["primary_focus"],
                "unassessed_count": len(diagnosis_data["unassessed_points"]),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    asyncio.run(smoke())
