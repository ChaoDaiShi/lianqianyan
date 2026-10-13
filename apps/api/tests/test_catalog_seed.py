from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.seed import CATALOG_COURSES, CATALOG_KNOWLEDGE_POINTS, seed_catalog_data
from app.domain import Base
from app.domain.models import Course, KnowledgePoint, LearningEvidence, MasteryRecord


def test_catalog_seed_creates_no_learner_state() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        seed_catalog_data(db)

        assert db.query(Course).count() == len(CATALOG_COURSES)
        assert db.query(KnowledgePoint).count() == len(CATALOG_KNOWLEDGE_POINTS)
        assert {course.id for course in db.query(Course).all()} == {
            item["id"] for item in CATALOG_COURSES
        }
        assert (
            db.query(KnowledgePoint)
            .filter(KnowledgePoint.course_id == "course-net")
            .count()
            == 5
        )
        assert (
            db.query(KnowledgePoint)
            .filter(KnowledgePoint.course_id == "course-ds")
            .count()
            == 10
        )
        assert db.query(MasteryRecord).count() == 0
        assert db.query(LearningEvidence).count() == 0

    engine.dispose()
