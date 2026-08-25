from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

SearchLanguage = Literal["zh", "en"]


class NetworkSearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=100)
    limit: int = Field(default=4, ge=1, le=6)
    language: SearchLanguage = "zh"

    @field_validator("query", mode="before")
    @classmethod
    def normalize_query(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class NetworkSearchResult(BaseModel):
    title: str
    summary: str
    url: str
    source_domain: str


class NetworkSearchResponse(BaseModel):
    provider: Literal["wikipedia"] = "wikipedia"
    query: str
    results: list[NetworkSearchResult] = Field(default_factory=list)
