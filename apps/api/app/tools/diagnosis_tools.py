from __future__ import annotations

from typing import ClassVar

from sqlalchemy.orm import Session

from app.services.diagnosis_service import DiagnosisService
from app.tools.base import EducationTool
from app.tools.profile_tools import LearnerCourseInput, resolve_course_name


class GetLearningDiagnosisTool(EducationTool[LearnerCourseInput]):
    name: ClassVar[str] = "get_learning_diagnosis"
    description: ClassVar[str] = "读取基于当前学习画像计算的结构化学习诊断"
    capability: ClassVar[str] = "diagnosis"
    read_only: ClassVar[bool] = True
    input_model: ClassVar[type[LearnerCourseInput]] = LearnerCourseInput

    def __init__(self, db: Session) -> None:
        self._db = db
        self._service = DiagnosisService(db)

    def invoke(self, arguments: LearnerCourseInput) -> object:
        return self._service.diagnose_learner_course(
            arguments.learner_id,
            arguments.course_id,
            resolve_course_name(self._db, arguments.course_id),
        )
