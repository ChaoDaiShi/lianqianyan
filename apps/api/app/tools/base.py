from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import ClassVar, Generic, TypeVar

from pydantic import BaseModel, Field, ValidationError

logger = logging.getLogger(__name__)
InputT = TypeVar("InputT", bound=BaseModel)


class ToolDefinition(BaseModel):
    name: str
    description: str
    capability: str
    read_only: bool
    input_schema: dict[str, object]


class ToolError(BaseModel):
    code: str
    message: str


class ToolResult(BaseModel):
    success: bool
    data: object | None = None
    error: ToolError | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class EducationTool(ABC, Generic[InputT]):
    name: ClassVar[str]
    description: ClassVar[str]
    capability: ClassVar[str]
    read_only: ClassVar[bool]
    input_model: ClassVar[type[InputT]]

    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name=self.name,
            description=self.description,
            capability=self.capability,
            read_only=self.read_only,
            input_schema=self.input_model.model_json_schema(),
        )

    def execute(self, raw_arguments: dict[str, object]) -> ToolResult:
        try:
            arguments = self.input_model.model_validate(raw_arguments)
        except ValidationError as exc:
            fields = ", ".join(
                ".".join(str(part) for part in error["loc"])
                for error in exc.errors()
            )
            return ToolResult(
                success=False,
                error=ToolError(
                    code="INVALID_ARGUMENTS",
                    message=f"Invalid arguments: {fields}",
                ),
            )

        try:
            data = self.invoke(arguments)
            if isinstance(data, BaseModel):
                data = data.model_dump(mode="json")
            elif isinstance(data, list):
                data = [
                    item.model_dump(mode="json") if isinstance(item, BaseModel) else item
                    for item in data
                ]
            if not self.read_only:
                logger.info(
                    "education write tool completed: tool_name=%s success=True",
                    self.name,
                )
            return ToolResult(success=True, data=data)
        except Exception:
            logger.exception("education tool execution failed: tool_name=%s", self.name)
            if not self.read_only:
                logger.info(
                    "education write tool failed: tool_name=%s success=False",
                    self.name,
                )
            return ToolResult(
                success=False,
                error=ToolError(
                    code="TOOL_EXECUTION_FAILED",
                    message="The education tool could not complete the request.",
                ),
            )

    @abstractmethod
    def invoke(self, arguments: InputT) -> object:
        raise NotImplementedError
