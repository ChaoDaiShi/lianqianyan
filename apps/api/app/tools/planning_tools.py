from __future__ import annotations

from typing import ClassVar

from sqlalchemy.orm import Session

from app.services.dynamic_replanning_service import DynamicReplanningService
from app.services.study_plan_application_service import StudyPlanApplicationService
from app.tools.base import EducationTool
from app.tools.profile_tools import LearnerCourseInput


class GetCurrentStudyPlanTool(EducationTool[LearnerCourseInput]):
    name: ClassVar[str] = "get_current_study_plan"
    description: ClassVar[str] = "读取学习者在指定课程中的当前 ACTIVE 学习计划"
    capability: ClassVar[str] = "planning"
    read_only: ClassVar[bool] = True
    input_model: ClassVar[type[LearnerCourseInput]] = LearnerCourseInput

    def __init__(self, db: Session) -> None:
        self._service = StudyPlanApplicationService(db)

    def invoke(self, arguments: LearnerCourseInput) -> object:
        return self._service.get_current(arguments.learner_id, arguments.course_id)


class GenerateStudyPlanTool(EducationTool[LearnerCourseInput]):
    name: ClassVar[str] = "generate_study_plan"
    description: ClassVar[str] = "根据当前结构化诊断生成并原子激活学习计划"
    capability: ClassVar[str] = "planning"
    read_only: ClassVar[bool] = False
    input_model: ClassVar[type[LearnerCourseInput]] = LearnerCourseInput

    def __init__(self, db: Session) -> None:
        self._service = StudyPlanApplicationService(db)

    def invoke(self, arguments: LearnerCourseInput) -> object:
        return self._service.generate_plan(arguments.learner_id, arguments.course_id)


class ReplanStudyPlanTool(EducationTool[LearnerCourseInput]):
    name: ClassVar[str] = "replan_study_plan"
    description: ClassVar[str] = "根据最新诊断评估 Material Change 并按需原子替换当前计划"
    capability: ClassVar[str] = "planning"
    read_only: ClassVar[bool] = False
    input_model: ClassVar[type[LearnerCourseInput]] = LearnerCourseInput

    def __init__(self, db: Session) -> None:
        self._service = DynamicReplanningService(db)

    def invoke(self, arguments: LearnerCourseInput) -> object:
        return self._service.replan(arguments.learner_id, arguments.course_id)
