from __future__ import annotations

from app.knowledge.graph import KnowledgeGraphGenerator
from app.knowledge.models import RetrievedKnowledge
from app.knowledge.repository import KnowledgeRepository
from app.knowledge.retriever import TOP_K, BaseKnowledgeRetriever, LexicalKnowledgeRetriever


class GraphRAGRetriever(BaseKnowledgeRetriever):
    """Course-grounded retrieval with one-hop knowledge-point expansion."""

    def __init__(self, repository: KnowledgeRepository | None = None) -> None:
        self._repository = repository or KnowledgeRepository()
        self._lexical = LexicalKnowledgeRetriever(self._repository)
        self._graph = KnowledgeGraphGenerator(self._repository)

    def retrieve(
        self,
        course_id: str,
        query: str,
        knowledge_point_id: str | None = None,
        top_k: int = TOP_K,
    ) -> list[RetrievedKnowledge]:
        limit = max(1, min(top_k, 8))
        seeds = self._lexical.retrieve(
            course_id,
            query,
            knowledge_point_id,
            top_k=limit,
        )
        if not seeds:
            return []

        primary = seeds[0]
        graph = self._graph.generate(course_id)
        point_by_node = {
            node.id: node.knowledge_point_id
            for node in graph.nodes
            if node.kind == "knowledge_point" and node.knowledge_point_id
        }
        seed_node_id = f"point:{primary.knowledge_point_id}"
        neighbour_ids: list[str] = []
        for edge in graph.edges:
            if edge.source == seed_node_id and edge.target in point_by_node:
                neighbour_ids.append(point_by_node[edge.target])
            elif edge.target == seed_node_id and edge.source in point_by_node:
                neighbour_ids.append(point_by_node[edge.source])

        candidates: list[RetrievedKnowledge] = [primary]
        for neighbour_id in dict.fromkeys(neighbour_ids):
            neighbour_candidates = self._lexical.retrieve(
                course_id,
                query,
                neighbour_id,
                top_k=8,
            )
            neighbour = next(
                (
                    item
                    for item in neighbour_candidates
                    if item.knowledge_point_id == neighbour_id
                ),
                None,
            )
            if neighbour is not None:
                candidates.append(neighbour)
        candidates.extend(seeds[1:])

        output: list[RetrievedKnowledge] = []
        seen: set[str] = set()
        for item in candidates:
            if item.chunk_id in seen:
                continue
            seen.add(item.chunk_id)
            output.append(item)
            if len(output) == limit:
                break
        return output
