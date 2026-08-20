from __future__ import annotations

from app.knowledge.loader import chunk_document, document_sections, load_documents
from app.knowledge.models import KnowledgeChunk, KnowledgeDocument, KnowledgePointContent


class KnowledgeRepository:
    def __init__(self, documents: list[KnowledgeDocument] | None = None) -> None:
        self._documents = documents if documents is not None else load_documents()
        self._by_id = {document.id: document for document in self._documents}
        self._chunks = [chunk for document in self._documents for chunk in chunk_document(document)]

    def list_by_course(self, course_id: str) -> list[KnowledgeDocument]:
        return [item for item in self._documents if item.course_id == course_id]

    def list_by_knowledge_point(
        self, course_id: str, knowledge_point_id: str
    ) -> list[KnowledgeDocument]:
        return [
            item
            for item in self._documents
            if item.course_id == course_id and item.knowledge_point_id == knowledge_point_id
        ]

    def list_chunks_by_course(self, course_id: str) -> list[KnowledgeChunk]:
        return [item for item in self._chunks if item.course_id == course_id]

    def get_document(self, document_id: str) -> KnowledgeDocument | None:
        return self._by_id.get(document_id)

    def get_point_content(
        self, course_id: str, knowledge_point_id: str
    ) -> KnowledgePointContent | None:
        documents = self.list_by_knowledge_point(course_id, knowledge_point_id)
        if not documents:
            return None
        document = documents[0]
        return KnowledgePointContent(
            knowledge_point_id=knowledge_point_id,
            title=document.title,
            sections=document_sections(document),
        )
