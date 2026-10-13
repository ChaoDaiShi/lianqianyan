from __future__ import annotations

import hashlib
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adaptive.models import AdaptiveQuestionSubmission


def answer_fingerprint(answer: str, option_id: str | None) -> str:
    """Return the shared receipt hash; choice answers use the stable option ID."""
    value = option_id if option_id is not None else " ".join(answer.casefold().split())
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class AdaptiveQuestionSubmissionStore:
    """Flush-only receipt store shared by native practice and LEAP services."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_submission_id(
        self, learner_id: str, submission_id: str
    ) -> AdaptiveQuestionSubmission | None:
        return self._db.scalar(
            select(AdaptiveQuestionSubmission).where(
                AdaptiveQuestionSubmission.learner_id == learner_id,
                AdaptiveQuestionSubmission.submission_id == submission_id,
            )
        )

    def get_counted_item(
        self,
        learner_id: str,
        course_id: str,
        question_id: str,
        question_version: str,
    ) -> AdaptiveQuestionSubmission | None:
        return self._db.scalar(
            select(AdaptiveQuestionSubmission).where(
                AdaptiveQuestionSubmission.learner_id == learner_id,
                AdaptiveQuestionSubmission.course_id == course_id,
                AdaptiveQuestionSubmission.assessment_item_key
                == self.item_key(question_id, question_version),
            )
        )

    def get_for_assignment(
        self,
        learner_id: str,
        session_id: str,
        stage: str,
        question_id: str,
        question_version: str,
    ) -> AdaptiveQuestionSubmission | None:
        return self._db.scalar(
            select(AdaptiveQuestionSubmission).where(
                AdaptiveQuestionSubmission.learner_id == learner_id,
                AdaptiveQuestionSubmission.session_id == session_id,
                AdaptiveQuestionSubmission.stage == stage,
                AdaptiveQuestionSubmission.question_id == question_id,
                AdaptiveQuestionSubmission.question_version == question_version,
            )
        )

    @staticmethod
    def item_key(question_id: str, question_version: str) -> str:
        return f"{question_id}@{question_version}"

    def save_result(
        self,
        *,
        learner_id: str,
        course_id: str,
        knowledge_point_id: str,
        question_id: str,
        question_version: str,
        stage: str,
        session_id: str | None,
        submission_id: str,
        answer_hash: str,
        score: float,
        is_correct: bool,
        difficulty: float,
        grading_source: str,
        grading_version: str,
        independent: bool,
        hint_used: bool,
        counts_for_mastery: bool,
        misconception_code: str | None,
        evidence_id: str | None,
        result_json: dict,
    ) -> AdaptiveQuestionSubmission:
        record = AdaptiveQuestionSubmission(
            id=str(uuid.uuid4()),
            learner_id=learner_id,
            course_id=course_id,
            knowledge_point_id=knowledge_point_id,
            question_id=question_id,
            question_version=question_version,
            stage=stage,
            session_id=session_id,
            submission_id=submission_id,
            assessment_item_key=(
                self.item_key(question_id, question_version)
                if counts_for_mastery
                else None
            ),
            answer_hash=answer_hash,
            score=score,
            is_correct=is_correct,
            difficulty=difficulty,
            grading_source=grading_source,
            grading_version=grading_version,
            independent=independent,
            hint_used=hint_used,
            counts_for_mastery=counts_for_mastery,
            misconception_code=misconception_code,
            evidence_id=evidence_id,
            result_json=result_json,
        )
        self._db.add(record)
        self._db.flush()
        return record
