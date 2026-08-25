from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import pytest
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[3]


def server_parameters(tmp_path: Path) -> StdioServerParameters:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT / "apps" / "api")
    env["EDUCATION_DATABASE_URL"] = f"sqlite:///{tmp_path / 'mcp.db'}"
    return StdioServerParameters(
        command=sys.executable,
        args=["mcp/server/server.py"],
        cwd=str(ROOT),
        env=env,
    )


@pytest.mark.anyio
async def test_mcp_stdio_initialize_list_and_call_diagnosis(tmp_path: Path) -> None:
    async with stdio_client(server_parameters(tmp_path)) as (read, write):
        async with ClientSession(read, write) as session:
            initialized = await session.initialize()
            listed = await session.list_tools()
            called = await session.call_tool(
                "get_learning_diagnosis",
                {"learner_id": "test-learner-001", "course_id": "course-os"},
            )

    assert initialized.serverInfo.name == "educationmind-tools"
    assert [tool.name for tool in listed.tools] == [
        "get_learner_profile",
        "get_learning_diagnosis",
        "get_current_study_plan",
        "search_course_knowledge",
        "get_recent_learning_evidence",
        "generate_study_plan",
        "replan_study_plan",
    ]
    diagnosis = next(tool for tool in listed.tools if tool.name == "get_learning_diagnosis")
    generate = next(tool for tool in listed.tools if tool.name == "generate_study_plan")
    assert diagnosis.annotations is not None and diagnosis.annotations.readOnlyHint is True
    assert generate.annotations is not None and generate.annotations.readOnlyHint is False
    assert diagnosis.inputSchema["required"] == ["learner_id", "course_id"]
    assert called.isError is False
    assert called.structuredContent is not None
    assert called.structuredContent["success"] is True
    assert called.structuredContent["data"]["primary_focus"]["knowledge_point_id"] == "kp-deadlock"
    assert json.loads(called.content[0].text)["success"] is True


@pytest.mark.anyio
async def test_mcp_tool_errors_are_clean_and_server_survives(tmp_path: Path) -> None:
    async with stdio_client(server_parameters(tmp_path)) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            invalid = await session.call_tool(
                "search_course_knowledge",
                {"course_id": "course-os", "query": "PV", "top_k": 99},
            )
            missing = await session.call_tool("not_a_tool", {})
            listed = await session.list_tools()

    assert invalid.isError is True
    assert invalid.structuredContent["error"]["code"] == "INVALID_ARGUMENTS"
    assert "traceback" not in invalid.content[0].text.lower()
    assert missing.isError is True
    assert missing.structuredContent["error"]["code"] == "TOOL_NOT_FOUND"
    assert len(listed.tools) == 7
