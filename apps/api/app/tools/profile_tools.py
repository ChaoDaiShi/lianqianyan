from __future__ import annotations

from typing import ClassVar

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain import Course
from app.services.learner_profile_service import LearnerProfileService
from app.tools.base import EducationTool


class LearnerCourseInput(BaseModel):
    learner_id: str = Field(min_length=1)
    course_id: str = Field(min_length=1)


def resolve_course_name(db: Session, course_id: str) -> str:
    course = db.scalar(select(Course).where(Course.id == course_id))
    return course.name if course is not None else course_id


class GetLearnerProfileTool(EducationTool[LearnerCourseInput]):
    name: ClassVar[str] = "get_learner_profile"
    description: ClassVar[str] = "读取学习者在指定课程中的实时学习画像"
    capability: ClassVar[str] = "diagnosis"
    read_only: ClassVar[bool] = True
    input_model: ClassVar[type[LearnerCourseInput]] = LearnerCourseInput

    def __init__(self, db: Session) -> None:
        self._db = db
        self._service = LearnerProfileService(db)

    def invoke(self, arguments: LearnerCourseInput) -> object:
        return self._service.build_profile(
            arguments.learner_id,
            arguments.course_id,
            resolve_course_name(self._db, arguments.course_id),
        )
