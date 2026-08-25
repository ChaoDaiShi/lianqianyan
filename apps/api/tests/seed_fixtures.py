"""Deterministic learner state used only by behavioral tests."""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.core.seed import seed_catalog_data
from app.core.time import utc_now
from app.domain.models import MasteryRecord

TEST_LEARNER_ID = "test-learner-001"

TEST_MASTERY_BASELINE = [
    {
        "knowledge_point_id": "kp-process-concept",
        "mastery_score": 0.82,
        "confidence": 0.63,
        "evidence_count": 5,
    },
    {
        "knowledge_point_id": "kp-process-sync",
        "mastery_score": 0.60,
        "confidence": 0.50,
        "evidence_count": 4,
    },
    {
        "knowledge_point_id": "kp-pv",
        "mastery_score": 0.58,
        "confidence": 0.25,
        "evidence_count": 1,
    },
    {
        "knowledge_point_id": "kp-deadlock",
        "mastery_score": 0.46,
        "confidence": 0.45,
        "evidence_count": 3,
    },
]


def seed_test_data(db: Session) -> None:
    """Seed the shared catalog and one explicit test learner baseline."""
    seed_catalog_data(db)
    for item in TEST_MASTERY_BASELINE:
        existing = (
            db.query(MasteryRecord)
            .filter(
                MasteryRecord.learner_id == TEST_LEARNER_ID,
                MasteryRecord.knowledge_point_id
                == item["knowledge_point_id"],
            )
            .first()
        )
        if existing is not None:
            continue
        now = utc_now()
        db.add(
            MasteryRecord(
                id=str(uuid.uuid4()),
                learner_id=TEST_LEARNER_ID,
                knowledge_point_id=item["knowledge_point_id"],
                mastery_score=item["mastery_score"],
                confidence=item["confidence"],
                evidence_count=item["evidence_count"],
                created_at=now,
                updated_at=now,
            )
        )
    db.commit()
