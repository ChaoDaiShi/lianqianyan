from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.seed import seed_catalog_data
from app.domain import Base
from app.domain.models import Course, KnowledgePoint, LearningEvidence, MasteryRecord


def test_catalog_seed_creates_no_learner_state() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        seed_catalog_data(db)

        assert db.query(Course).count() == 1
        assert db.query(KnowledgePoint).count() == 5
        assert db.query(MasteryRecord).count() == 0
        assert db.query(LearningEvidence).count() == 0

    engine.dispose()
