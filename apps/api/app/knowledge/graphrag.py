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
        prerequisite_ids: set[str] = set()
        for edge in graph.edges:
            if edge.relation != "precedes":
                continue
            if edge.source == seed_node_id and edge.target in point_by_node:
                neighbour_ids.append(point_by_node[edge.target])
            elif edge.target == seed_node_id and edge.source in point_by_node:
                neighbour_ids.append(point_by_node[edge.source])
                prerequisite_ids.add(point_by_node[edge.source])

        # Keep the lexical ranking as the main signal. Graph neighbours are context,
        # not permission to put an unrelated paragraph ahead of a matching passage.
        candidates: list[RetrievedKnowledge] = list(seeds)
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
                candidates.append(neighbour.model_copy(update={"score": neighbour.score * 0.35}))
        candidates.sort(key=lambda item: (-item.score, item.document_id, item.chunk_id))

        output: list[RetrievedKnowledge] = []
        seen: set[str] = set()
        for item in candidates:
            if item.chunk_id in seen:
                continue
            seen.add(item.chunk_id)
            output.append(item)
            if len(output) == limit:
                break
        # A wider tutor context keeps one declared prerequisite when all direct
        # hits come from a single point. Short search results keep pure relevance.
        if limit >= 3 and len({item.knowledge_point_id for item in output}) == 1:
            prerequisite = next(
                (item for item in candidates if item.knowledge_point_id in prerequisite_ids),
                None,
            )
            if prerequisite is not None and prerequisite.chunk_id not in {item.chunk_id for item in output}:
                output = [*output[: limit - 1], prerequisite]
        return output
