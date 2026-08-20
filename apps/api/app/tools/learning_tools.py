from __future__ import annotations

from typing import ClassVar

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.learning_evidence import LearningEvidenceRepository
from app.tools.base import EducationTool


class RecentLearningEvidenceInput(BaseModel):
    learner_id: str = Field(min_length=1)
    course_id: str = Field(min_length=1)
    limit: int = Field(default=5, ge=1, le=100)


class GetRecentLearningEvidenceTool(EducationTool[RecentLearningEvidenceInput]):
    name: ClassVar[str] = "get_recent_learning_evidence"
    description: ClassVar[str] = "读取学习者在指定课程中的最近学习证据"
    capability: ClassVar[str] = "assessment"
    read_only: ClassVar[bool] = True
    input_model: ClassVar[type[RecentLearningEvidenceInput]] = RecentLearningEvidenceInput

    def __init__(self, db: Session) -> None:
        self._repository = LearningEvidenceRepository(db)

    def invoke(self, arguments: RecentLearningEvidenceInput) -> object:
        return self._repository.list_recent_by_learner(
            arguments.learner_id,
            course_id=arguments.course_id,
            limit=arguments.limit,
        )
