from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class KnowledgeReference(BaseModel):
    title: str
    url: str | None = None
    locator: str = ""
    verificationStatus: str = "reference_only"


class KnowledgeProvenance(BaseModel):
    version: str = "builtin-v1"
    material_path: str = ""
    source_refs: list[KnowledgeReference] = Field(default_factory=list)


class KnowledgeDocument(KnowledgeProvenance):
    id: str
    course_id: str
    knowledge_point_id: str
    title: str
    content: str
    source: str = "builtin_course_material"
    prerequisite_ids: list[str] = Field(default_factory=list)
    aliases: list[str] = Field(default_factory=list)
    objectives: list[dict[str, str]] = Field(default_factory=list)
    order: int = 0


class KnowledgeChunk(KnowledgeProvenance):
    id: str
    document_id: str
    course_id: str
    knowledge_point_id: str
    title: str
    section: str
    content: str
    chunk_index: int
    source: str = "builtin_course_material"
    aliases: list[str] = Field(default_factory=list)


class RetrievedKnowledge(KnowledgeProvenance):
    chunk_id: str
    document_id: str
    title: str
    section: str
    knowledge_point_id: str
    content: str
    score: float
    source: str


class KnowledgeSource(KnowledgeProvenance):
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
    retrieval_mode: Literal["graph_rag_course_grounded"] = "graph_rag_course_grounded"
    results: list[RetrievedKnowledge] = Field(default_factory=list)


class KnowledgeSection(BaseModel):
    title: str
    content: str


class KnowledgePointContent(KnowledgeProvenance):
    knowledge_point_id: str
    title: str
    sections: list[KnowledgeSection] = Field(default_factory=list)
    objectives: list[dict[str, str]] = Field(default_factory=list)
    prerequisite_ids: list[str] = Field(default_factory=list)


class KnowledgeGraphNode(BaseModel):
    id: str
    label: str
    kind: Literal["course", "knowledge_point", "section"]
    knowledge_point_id: str | None = None
    source_sections: list[str] = Field(default_factory=list)
    order: int = 0


class KnowledgeGraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relation: Literal["contains", "explains", "precedes"]
    source_sections: list[str] = Field(default_factory=list)


class KnowledgeGraphOut(BaseModel):
    course_id: str
    generation_mode: Literal["graph_rag_course_grounded"] = "graph_rag_course_grounded"
    nodes: list[KnowledgeGraphNode] = Field(default_factory=list)
    edges: list[KnowledgeGraphEdge] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    catalog_version: str = "builtin-v1"
