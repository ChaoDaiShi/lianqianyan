from __future__ import annotations

from typing import ClassVar

import pytest
from pydantic import BaseModel, Field

from app.tools.base import EducationTool, ToolResult
from app.tools.registry import EducationToolRegistry


class EchoInput(BaseModel):
    message: str = Field(min_length=1)


class EchoTool(EducationTool[EchoInput]):
    name: ClassVar[str] = "echo"
    description: ClassVar[str] = "Echo validated input"
    capability: ClassVar[str] = "testing"
    read_only: ClassVar[bool] = True
    input_model: ClassVar[type[EchoInput]] = EchoInput

    def invoke(self, arguments: EchoInput) -> object:
        return {"message": arguments.message}


class BrokenTool(EchoTool):
    name: ClassVar[str] = "broken"

    def invoke(self, arguments: EchoInput) -> object:
        raise RuntimeError("database password must stay private")


class WriteInput(BaseModel):
    learner_id: str
    course_id: str


class WriteTool(EducationTool[WriteInput]):
    name: ClassVar[str] = "write_plan"
    description: ClassVar[str] = "Write a plan"
    capability: ClassVar[str] = "planning"
    read_only: ClassVar[bool] = False
    input_model: ClassVar[type[WriteInput]] = WriteInput

    def invoke(self, arguments: WriteInput) -> object:
        return {"written": True}


class BrokenWriteTool(WriteTool):
    name: ClassVar[str] = "broken_write"

    def invoke(self, arguments: WriteInput) -> object:
        raise RuntimeError("database password must stay private")


def test_registry_lists_pydantic_schema_and_read_boundary() -> None:
    registry = EducationToolRegistry([EchoTool()])

    definitions = registry.list_tools()

    assert len(definitions) == 1
    assert definitions[0].name == "echo"
    assert definitions[0].read_only is True
    assert definitions[0].input_schema["required"] == ["message"]
    assert definitions[0].input_schema["properties"]["message"]["minLength"] == 1


def test_registry_rejects_duplicate_names() -> None:
    with pytest.raises(ValueError, match="duplicate education tool name: echo"):
        EducationToolRegistry([EchoTool(), EchoTool()])


def test_registry_executes_validated_tool() -> None:
    result = EducationToolRegistry([EchoTool()]).execute("echo", {"message": "hello"})

    assert result == ToolResult(success=True, data={"message": "hello"})


def test_registry_returns_structured_validation_error() -> None:
    result = EducationToolRegistry([EchoTool()]).execute("echo", {"message": ""})

    assert result.success is False
    assert result.error is not None
    assert result.error.code == "INVALID_ARGUMENTS"
    assert "message" in result.error.message


def test_registry_returns_structured_unknown_tool_error() -> None:
    result = EducationToolRegistry([EchoTool()]).execute("missing", {})

    assert result.success is False
    assert result.error is not None
    assert result.error.code == "TOOL_NOT_FOUND"


def test_registry_logs_write_tool_outcome_without_payload(caplog) -> None:
    registry = EducationToolRegistry([WriteTool()])

    with caplog.at_level("INFO", logger="app.tools.base"):
        result = registry.execute(
            "write_plan",
            {"learner_id": "learner-secret", "course_id": "course-secret"},
        )

    assert result.success is True
    assert "education write tool completed: tool_name=write_plan success=True" in caplog.text
    assert "learner-secret" not in caplog.text
    assert "course-secret" not in caplog.text


def test_registry_logs_failed_write_tool_outcome_without_payload(caplog) -> None:
    registry = EducationToolRegistry([BrokenWriteTool()])

    with caplog.at_level("INFO", logger="app.tools.base"):
        result = registry.execute(
            "broken_write",
            {"learner_id": "learner-secret", "course_id": "course-secret"},
        )

    assert result.success is False
    assert "education write tool failed: tool_name=broken_write success=False" in caplog.text
    assert "learner-secret" not in caplog.text
    assert "course-secret" not in caplog.text


def test_registry_hides_internal_exception_details() -> None:
    result = EducationToolRegistry([BrokenTool()]).execute(
        "broken", {"message": "hello"}
    )

    assert result.success is False
    assert result.error is not None
    assert result.error.code == "TOOL_EXECUTION_FAILED"
    assert "password" not in result.error.message
    assert "traceback" not in result.model_dump_json().lower()
