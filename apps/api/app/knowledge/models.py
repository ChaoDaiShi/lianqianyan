from __future__ import annotations

from pydantic import BaseModel, Field


class KnowledgeDocument(BaseModel):
    id: str
    course_id: str
    knowledge_point_id: str
    title: str
    content: str
    source: str = "builtin_course_material"


class KnowledgeChunk(BaseModel):
    id: str
    document_id: str
    course_id: str
    knowledge_point_id: str
    title: str
    section: str
    content: str
    chunk_index: int
    source: str = "builtin_course_material"


class RetrievedKnowledge(BaseModel):
    chunk_id: str
    document_id: str
    title: str
    section: str
    knowledge_point_id: str
    content: str
    score: float
    source: str


class KnowledgeSource(BaseModel):
    id: str
    title: str
    section: str
    knowledge_point_id: str
    excerpt: str


class KnowledgeSearchRequest(BaseModel):
    course_id: str = Field(min_length=1)
    query: str = Field(min_length=1)
    knowledge_point_id: str | None = None
    top_k: int = Field(default=4, ge=1, le=8)


class KnowledgeSearchResponse(BaseModel):
    results: list[RetrievedKnowledge] = Field(default_factory=list)


class KnowledgeSection(BaseModel):
    title: str
    content: str


class KnowledgePointContent(BaseModel):
    knowledge_point_id: str
    title: str
    sections: list[KnowledgeSection] = Field(default_factory=list)
