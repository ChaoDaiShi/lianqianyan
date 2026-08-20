from __future__ import annotations

from app.knowledge.models import KnowledgeSource, RetrievedKnowledge
from app.knowledge.retriever import TOP_K, BaseKnowledgeRetriever, LexicalKnowledgeRetriever


class KnowledgeContextBuilder:
    def __init__(self, retriever: BaseKnowledgeRetriever | None = None) -> None:
        self._retriever = retriever or LexicalKnowledgeRetriever()

    def build(
        self,
        course_id: str,
        query: str,
        knowledge_point_id: str | None = None,
        top_k: int = TOP_K,
    ) -> list[RetrievedKnowledge]:
        return self._retriever.retrieve(course_id, query, knowledge_point_id, top_k)

    @staticmethod
    def sources(results: list[RetrievedKnowledge]) -> list[KnowledgeSource]:
        return [
            KnowledgeSource(
                id=item.chunk_id,
                title=f"{item.title} · {item.section}",
                section=item.section,
                knowledge_point_id=item.knowledge_point_id,
                excerpt=_excerpt(item.content),
            )
            for item in results
        ]


def _excerpt(content: str, limit: int = 180) -> str:
    compact = " ".join(content.split())
    return compact if len(compact) <= limit else f"{compact[:limit].rstrip()}…"
