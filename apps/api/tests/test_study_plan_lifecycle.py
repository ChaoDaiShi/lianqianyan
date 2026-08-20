from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.domain import Base, PlanStrategy, StudyPlan, StudyPlanStatus
from app.services.study_plan_repository import StudyPlanRepository


def _session(tmp_path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'lifecycle.db'}")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _insert_active(db: Session, plan_id: str, generated_at: datetime) -> None:
    db.add(
        StudyPlan(
            id=plan_id,
            learner_id="learner",
            course_id="course",
            strategy=PlanStrategy.DIAGNOSIS_DRIVEN.value,
            status=StudyPlanStatus.ACTIVE.value,
            generated_at=generated_at,
            source_diagnosis_generated_at=generated_at,
            reason_codes=[],
            created_at=generated_at,
            updated_at=generated_at,
        )
    )
    db.commit()


def test_legacy_multiple_active_reads_newest_warns_and_does_not_mutate(tmp_path, caplog) -> None:
    db = _session(tmp_path)
    now = datetime(2026, 8, 20, 8, 0, 0)
    _insert_active(db, "old", now - timedelta(days=1))
    _insert_active(db, "new", now)

    with caplog.at_level(logging.WARNING):
        current = StudyPlanRepository(db).get_active_by_learner_and_course("learner", "course")

    assert current is not None and current.id == "new"
    assert "multiple active plans detected" in caplog.text
    statuses = db.scalars(select(StudyPlan.status).order_by(StudyPlan.generated_at)).all()
    assert statuses == [StudyPlanStatus.ACTIVE.value, StudyPlanStatus.ACTIVE.value]
