"""Transactional lifecycle boundary for current study plans."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain import PersistedStudyPlan, StudyPlanDraft
from app.services.study_plan_persistence_service import StudyPlanPersistenceService
from app.services.study_plan_repository import StudyPlanRepository
from app.services.study_task_repository import StudyTaskRepository


class StudyPlanLifecycleService:
    """Create, replace, and read the single business-level ACTIVE plan."""

    def __init__(
        self,
        db: Session,
        persistence: StudyPlanPersistenceService | None = None,
        plan_repo: StudyPlanRepository | None = None,
        task_repo: StudyTaskRepository | None = None,
    ) -> None:
        self._db = db
        self._plan_repo = plan_repo or StudyPlanRepository(db)
        self._task_repo = task_repo or StudyTaskRepository(db)
        self._persistence = persistence or StudyPlanPersistenceService(
            db, plan_repo=self._plan_repo, task_repo=self._task_repo
        )

    def get_current_plan(
        self, learner_id: str, course_id: str
    ) -> PersistedStudyPlan | None:
        plan = self._plan_repo.get_active_by_learner_and_course(learner_id, course_id)
        if plan is None:
            return None
        return StudyPlanRepository.to_domain(
            plan, self._task_repo.list_by_plan_id(plan.id)
        )

    def create_initial_plan(self, draft: StudyPlanDraft) -> PersistedStudyPlan:
        if self._plan_repo.get_active_by_learner_and_course(
            draft.learner_id, draft.course_id
        ) is not None:
            return self.replace_active_plan(draft)
        return self._commit_staged(draft)

    def replace_active_plan(self, draft: StudyPlanDraft) -> PersistedStudyPlan:
        try:
            self._plan_repo.supersede_active_for_learner_course(
                draft.learner_id, draft.course_id
            )
            persisted = self._persistence.stage(draft)
            self._db.commit()
            return persisted
        except Exception:
            self._db.rollback()
            raise

    def _commit_staged(self, draft: StudyPlanDraft) -> PersistedStudyPlan:
        try:
            persisted = self._persistence.stage(draft)
            self._db.commit()
            return persisted
        except Exception:
            self._db.rollback()
            raise
