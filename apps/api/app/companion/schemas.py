from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class CompanionThreadCreate(BaseModel):
    course_id: str = Field(min_length=1, max_length=36)
    title: str = Field(default="新对话", min_length=1, max_length=120)

    @field_validator("course_id", "title")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class CompanionMessageCreate(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8_000)
    context_used: list[str] = Field(default_factory=list, max_length=20)
    suggested_actions: list[str] = Field(default_factory=list, max_length=10)
    provider: str | None = Field(default=None, max_length=80)
    model: str | None = Field(default=None, max_length=160)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        return value.strip()


class CompanionMessageOut(CompanionMessageCreate):
    id: str
    created_at: datetime


class CompanionMemoryCreate(BaseModel):
    content: str = Field(min_length=1, max_length=500)
    source_message_id: str | None = Field(default=None, max_length=36)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        return value.strip()


class CompanionMemoryOut(CompanionMemoryCreate):
    id: str
    created_at: datetime


class CompanionThreadOut(BaseModel):
    id: str
    account_id: str
    course_id: str
    title: str
    messages: list[CompanionMessageOut]
    memories: list[CompanionMemoryOut]
    message_count: int
    memory_count: int
    created_at: datetime
    updated_at: datetime
