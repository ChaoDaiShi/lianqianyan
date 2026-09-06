from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ResourceType(StrEnum):
    STUDY_SHEET = "study_sheet"
    FLASHCARDS = "flashcards"
    QUIZ = "quiz"
    MIND_MAP = "mind_map"
    STUDY_PLAN = "study_plan"
    PRESENTATION = "presentation"


class PresentationSlide(BaseModel):
    layout: Literal["title", "content", "question", "summary", "sources"]
    title: str = Field(min_length=1, max_length=160)
    subtitle: str = Field(default="", max_length=300)
    bullets: list[str] = Field(default_factory=list, max_length=12)
    speaker_notes: str = Field(default="", max_length=2_000)


class ResourceGenerationRequest(BaseModel):
    course_id: str = Field(min_length=1, max_length=100)
    knowledge_point_id: str = Field(min_length=1, max_length=100)
    resource_type: ResourceType

    @field_validator("course_id", "knowledge_point_id", mode="before")
    @classmethod
    def normalize_identifier(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class GeneratedResource(BaseModel):
    title: str
    resource_type: ResourceType
    format: Literal["markdown", "presentation"] = "markdown"
    content: str
    generation_mode: Literal["course_template"] = "course_template"
    source_sections: list[str] = Field(default_factory=list)
    filename: str
    slides: list[PresentationSlide] = Field(default_factory=list)


class ImagePlanPayload(BaseModel):
    """前端/规划端点传递的配图方案。"""

    should_generate: bool = True
    reason: str = Field(default="", max_length=200)
    central_metaphor: str = Field(default="", max_length=160)
    card_metaphors: list[str] = Field(default_factory=list, max_length=8)
    planned_by: Literal["llm", "heuristic"] = "llm"


class ResourceImageRequest(BaseModel):
    course_id: str = Field(min_length=1, max_length=100)
    knowledge_point_id: str = Field(min_length=1, max_length=100)
    aspect_ratio: Literal["1:1", "16:9", "4:3"] = "16:9"
    plan: ImagePlanPayload | None = None


class GeneratedResourceImage(BaseModel):
    provider: Literal["minimax"] = "minimax"
    model: str
    prompt: str
    image_urls: list[str] = Field(default_factory=list)
    skipped: bool = False
    skip_reason: str = ""


class TextVerifyRequest(BaseModel):
    content: str = Field(min_length=1, max_length=12_000)


class TextCheckOut(BaseModel):
    available: bool
    passed: bool = False
    summary: str = ""
    issues: list[str] = Field(default_factory=list, max_length=10)
    provider: str | None = None


class ResourceOptimizeRequest(BaseModel):
    content: str = Field(min_length=1, max_length=12_000)


class OptimizedResource(BaseModel):
    content: str
    provider: str
    model: str | None = None
