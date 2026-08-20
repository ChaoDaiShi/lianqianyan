"""服务层 —— 封装领域业务逻辑，供 API 路由 / 诊断 Agent / 未来 MCP Tool 调用。"""

from app.services.diagnosis_service import DiagnosisService
from app.services.dynamic_replanning_service import DynamicReplanningService
from app.services.evidence_classification import EvidenceClassifier
from app.services.knowledge_diagnosis_policy import (
    DiagnosisThresholds,
    KnowledgeDiagnosisPolicy,
    KnowledgePointDiagnosisResult,
)
from app.services.knowledge_point_repository import KnowledgePointRepository
from app.services.learner_profile_service import LearnerProfileService
from app.services.learning_evidence import LearningEvidenceRepository
from app.services.learning_evidence_service import LearningEvidenceService
from app.services.mastery_projection_service import MasteryProjectionService, ProjectionResult
from app.services.mastery_repository import MasteryRepository
from app.services.mastery_update_policy import MasteryProjection, MasteryUpdatePolicy
from app.services.practice_evaluation_service import PracticeEvaluationService
from app.services.replanning_policy import ReplanningPolicy
from app.services.priority_policy import PriorityPolicy
from app.services.study_plan_application_service import StudyPlanApplicationService
from app.services.study_plan_lifecycle_service import StudyPlanLifecycleService
from app.services.study_plan_persistence_service import StudyPlanPersistenceService
from app.services.study_plan_repository import StudyPlanRepository
from app.services.study_planner_policy import PlannerConfig, StudyPlannerPolicy
from app.services.study_planner_service import StudyPlannerService
from app.services.study_task_repository import StudyTaskRepository
from app.services.tutor_context_builder import TutorContextBuilder
from app.services.tutor_prompt import TutorPromptBuilder
from app.services.tutor_service import TutorService

__all__ = [
    "DiagnosisService",
    "DynamicReplanningService",
    "DiagnosisThresholds",
    "EvidenceClassifier",
    "KnowledgeDiagnosisPolicy",
    "KnowledgePointDiagnosisResult",
    "KnowledgePointRepository",
    "LearnerProfileService",
    "LearningEvidenceRepository",
    "LearningEvidenceService",
    "MasteryProjection",
    "MasteryProjectionService",
    "MasteryRepository",
    "MasteryUpdatePolicy",
    "PlannerConfig",
    "PracticeEvaluationService",
    "PriorityPolicy",
    "ReplanningPolicy",
    "ProjectionResult",
    "StudyPlanApplicationService",
    "StudyPlanLifecycleService",
    "StudyPlanPersistenceService",
    "StudyPlanRepository",
    "StudyPlannerPolicy",
    "StudyPlannerService",
    "StudyTaskRepository",
    "TutorContextBuilder",
    "TutorPromptBuilder",
    "TutorService",
]
