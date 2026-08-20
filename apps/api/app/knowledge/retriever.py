from __future__ import annotations

import re
from abc import ABC, abstractmethod

from app.knowledge.models import KnowledgeChunk, RetrievedKnowledge
from app.knowledge.repository import KnowledgeRepository

TOP_K = 4
KNOWLEDGE_POINT_BOOST = 3.0
TITLE_BOOST = 2.0


class BaseKnowledgeRetriever(ABC):
    @abstractmethod
    def retrieve(
        self,
        course_id: str,
        query: str,
        knowledge_point_id: str | None = None,
        top_k: int = TOP_K,
    ) -> list[RetrievedKnowledge]: ...


class LexicalKnowledgeRetriever(BaseKnowledgeRetriever):
    def __init__(self, repository: KnowledgeRepository | None = None) -> None:
        self._repository = repository or KnowledgeRepository()

    def retrieve(
        self,
        course_id: str,
        query: str,
        knowledge_point_id: str | None = None,
        top_k: int = TOP_K,
    ) -> list[RetrievedKnowledge]:
        query_terms = _terms(query)
        ranked: list[tuple[float, KnowledgeChunk]] = []
        for chunk in self._repository.list_chunks_by_course(course_id):
            score = _score(chunk, query_terms, knowledge_point_id)
            if score > 0:
                ranked.append((score, chunk))
        ranked.sort(key=lambda item: (-item[0], item[1].document_id, item[1].chunk_index))
        return [
            RetrievedKnowledge(
                chunk_id=chunk.id,
                document_id=chunk.document_id,
                title=chunk.title,
                section=chunk.section,
                knowledge_point_id=chunk.knowledge_point_id,
                content=chunk.content,
                score=round(score, 4),
                source=chunk.source,
            )
            for score, chunk in ranked[: max(1, min(top_k, 8))]
        ]


def _score(
    chunk: KnowledgeChunk,
    query_terms: set[str],
    knowledge_point_id: str | None,
) -> float:
    content_terms = _terms(f"{chunk.title} {chunk.section} {chunk.content}")
    overlap = len(query_terms & content_terms)
    score = float(overlap)
    if query_terms:
        score += overlap / len(query_terms)
    title_terms = _terms(f"{chunk.title} {chunk.section}")
    score += len(query_terms & title_terms) * TITLE_BOOST
    if knowledge_point_id and chunk.knowledge_point_id == knowledge_point_id:
        score += KNOWLEDGE_POINT_BOOST
    return score


def _terms(text: str) -> set[str]:
    normalized = text.lower()
    terms = set(re.findall(r"[a-z0-9_]+", normalized))
    chinese_runs = re.findall(r"[一-鿿]+", normalized)
    for run in chinese_runs:
        terms.add(run)
        terms.update(run[index : index + 2] for index in range(max(0, len(run) - 1)))
        terms.update(run[index : index + 3] for index in range(max(0, len(run) - 2)))
    return {term for term in terms if term}
