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

    def generate(
        self, course_id: str, *, course_label: str | None = None
    ) -> KnowledgeGraphOut:
        documents = self._repository.list_by_course(course_id)
        if not documents:
            return KnowledgeGraphOut(course_id=course_id)

        course_node_id = f"course:{course_id}"
        nodes = [
            KnowledgeGraphNode(
                id=course_node_id,
                label=(course_label or course_id).strip() or course_id,
                kind="course",
                source_sections=[],
            )
        ]
        edges: list[KnowledgeGraphEdge] = []
        sources: list[str] = []
        point_ids = {document.knowledge_point_id for document in documents}

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
                    order=document.order,
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
            for prerequisite_id in document.prerequisite_ids:
                if prerequisite_id not in point_ids:
                    raise ValueError(f"Unknown prerequisite {prerequisite_id} for {document.knowledge_point_id}")
                prerequisite_node_id = f"point:{prerequisite_id}"
                declaration = (
                    f"curriculum/course_ds.json · {document.knowledge_point_id} · prerequisiteIds"
                    if course_id == "course-ds"
                    else f"{document.material_path or document.id} · prerequisite_ids"
                )
                if declaration not in sources:
                    sources.append(declaration)
                edges.append(
                    KnowledgeGraphEdge(
                        id=f"precedes:{prerequisite_node_id}:{point_node_id}",
                        source=prerequisite_node_id,
                        target=point_node_id,
                        relation="precedes",
                        source_sections=[declaration],
                    )
                )
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
                        order=index,
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

        nodes[0] = nodes[0].model_copy(update={"source_sections": sources})
        return KnowledgeGraphOut(
            course_id=course_id,
            nodes=nodes,
            edges=edges,
            sources=sources,
            catalog_version=documents[0].version,
        )
