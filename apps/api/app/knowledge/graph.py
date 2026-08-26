from __future__ import annotations

from app.knowledge.models import (
    KnowledgeGraphEdge,
    KnowledgeGraphNode,
    KnowledgeGraphOut,
)
from app.knowledge.repository import KnowledgeRepository
from app.knowledge.loader import document_sections


class KnowledgeGraphGenerator:
    def __init__(self, repository: KnowledgeRepository | None = None) -> None:
        self._repository = repository or KnowledgeRepository()

    def generate(self, course_id: str) -> KnowledgeGraphOut:
        documents = self._repository.list_by_course(course_id)
        if not documents:
            return KnowledgeGraphOut(course_id=course_id)

        course_node_id = f"course:{course_id}"
        nodes = [
            KnowledgeGraphNode(
                id=course_node_id,
                label=course_id,
                kind="course",
                source_sections=[],
            )
        ]
        edges: list[KnowledgeGraphEdge] = []
        sources: list[str] = []
        previous_point_id: str | None = None
        previous_point_source: list[str] = []

        for document in documents:
            point_node_id = f"point:{document.knowledge_point_id}"
            sections = document_sections(document)
            point_sources = [f"{document.title} · {section.title}" for section in sections]
            sources.extend(point_sources)
            nodes.append(
                KnowledgeGraphNode(
                    id=point_node_id,
                    label=document.title,
                    kind="knowledge_point",
                    knowledge_point_id=document.knowledge_point_id,
                    source_sections=point_sources,
                )
            )
            edges.append(
                KnowledgeGraphEdge(
                    id=f"contains:{course_node_id}:{point_node_id}",
                    source=course_node_id,
                    target=point_node_id,
                    relation="contains",
                    source_sections=point_sources,
                )
            )
            if previous_point_id is not None:
                edges.append(
                    KnowledgeGraphEdge(
                        id=f"precedes:{previous_point_id}:{point_node_id}",
                        source=previous_point_id,
                        target=point_node_id,
                        relation="precedes",
                        source_sections=[*previous_point_source[-1:], *point_sources[:1]],
                    )
                )
            previous_section_id: str | None = None
            previous_section_source: str | None = None
            for index, section in enumerate(sections, start=1):
                section_node_id = f"section:{document.knowledge_point_id}:{index}"
                section_source = f"{document.title} · {section.title}"
                nodes.append(
                    KnowledgeGraphNode(
                        id=section_node_id,
                        label=section.title,
                        kind="section",
                        knowledge_point_id=document.knowledge_point_id,
                        source_sections=[section_source],
                    )
                )
                edges.append(
                    KnowledgeGraphEdge(
                        id=f"explains:{point_node_id}:{section_node_id}",
                        source=point_node_id,
                        target=section_node_id,
                        relation="explains",
                        source_sections=[section_source],
                    )
                )
                if previous_section_id is not None and previous_section_source is not None:
                    edges.append(
                        KnowledgeGraphEdge(
                            id=f"precedes:{previous_section_id}:{section_node_id}",
                            source=previous_section_id,
                            target=section_node_id,
                            relation="precedes",
                            source_sections=[previous_section_source, section_source],
                        )
                    )
                previous_section_id = section_node_id
                previous_section_source = section_source
            previous_point_id = point_node_id
            previous_point_source = point_sources

        nodes[0] = nodes[0].model_copy(update={"source_sections": sources})
        return KnowledgeGraphOut(
            course_id=course_id,
            nodes=nodes,
            edges=edges,
            sources=sources,
        )
