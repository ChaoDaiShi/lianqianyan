from __future__ import annotations

from typing import ClassVar

from app.knowledge import LexicalKnowledgeRetriever
from app.knowledge.models import KnowledgeSearchRequest
from app.tools.base import EducationTool


class SearchCourseKnowledgeTool(EducationTool[KnowledgeSearchRequest]):
    name: ClassVar[str] = "search_course_knowledge"
    description: ClassVar[str] = "在指定课程的内置教学材料中检索相关知识片段"
    capability: ClassVar[str] = "tutoring"
    read_only: ClassVar[bool] = True
    input_model: ClassVar[type[KnowledgeSearchRequest]] = KnowledgeSearchRequest

    def __init__(self, retriever: LexicalKnowledgeRetriever | None = None) -> None:
        self._retriever = retriever or LexicalKnowledgeRetriever()

    def invoke(self, arguments: KnowledgeSearchRequest) -> object:
        return self._retriever.retrieve(
            arguments.course_id,
            arguments.query,
            knowledge_point_id=arguments.knowledge_point_id,
            top_k=arguments.top_k,
        )
