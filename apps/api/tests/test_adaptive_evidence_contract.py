from __future__ import annotations

import json
from pathlib import Path
from datetime import timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from hashlib import sha256

import app.adaptive.service as adaptive_service_module
from app.adaptive.models import AdaptiveKnowledgeState, AdaptiveSessionRecord
from app.core.time import utc_now
from app.adaptive.service import AdaptiveLearningService
from app.domain import Base, LearningEvidence


def _question_bank(
    practice_count: int = 2,
    probe_count: int = 2,
    retest_count: int = 1,
) -> dict:
    def item(question_id: str, stage: str, prompt: str) -> dict:
        return {
            "id": question_id,
            "version": "test-bank-v1",
            "courseId": "course-ds",
            "knowledgePointId": "kp-linear-list",
            "objectiveId": "linear-insertion-cost",
            "stage": stage,
            "prompt": prompt,
            "options": [
                {"id": "a", "label": "错误选项"},
                {"id": "b", "label": "正确选项"},
            ],
            "correctOptionId": "b",
            "explanation": "评分依据",
            "difficulty": 0.5,
            "sourceRefs": [],
            "misconceptionCode": "LL_IGNORES_SEARCH_COST",
        }

    questions = []
    for stage, count in (
        ("practice", practice_count),
        ("probe", probe_count),
        ("retest", retest_count),
    ):
        questions.extend(
            item(f"test-{stage}-{index + 1}", stage, f"{stage} 题 {index + 1}")
            for index in range(count)
        )
    return {
        "version": "test-bank-v1",
        "questions": questions,
    }


def _service(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    *,
    bank: dict | None = None,
) -> tuple[Session, AdaptiveLearningService]:
    bank_path = tmp_path / "course-ds.json"
    bank_path.write_text(json.dumps(bank or _question_bank()), encoding="utf-8")
    monkeypatch.setattr(
        adaptive_service_module,
        "QUESTION_BANK_PATH",
        bank_path,
        raising=False,
    )

    engine = create_engine(
        f"sqlite:///{tmp_path / 'adaptive-contract.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = factory()
    return db, AdaptiveLearningService(db)


def _start_teaching(service: AdaptiveLearningService, learner_id: str) -> dict:
    session = service.create_session(
        learner_id=learner_id,
        course_id="course-ds",
        topic_id="linked-list",
        policy="leap",
        experiment_group="D",
        time_budget_minutes=5,
    )
    diagnosed = service.diagnose(
        session["id"], learner_id, "已知前驱，修改链接 O(1)", "b", 30
    )
    return service.intervene(
        diagnosed["id"], learner_id, "contrastive_teaching"
    )


def test_reentering_same_topic_reuses_saved_diagnostic_instead_of_repeating_it(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db, service = _service(tmp_path, monkeypatch)
    learner_id = "learner-repeat-topic"
    first = service.create_session(
        learner_id=learner_id,
        course_id="course-ds",
        topic_id="linked-list",
        policy="leap",
        experiment_group="D",
    )
    first = service.diagnose(first["id"], learner_id, "正确诊断", "b", 20)
    original_evidence_id = first["diagnosis"]["evidenceIds"][0]
    evidence_count = len(db.scalars(select(LearningEvidence)).all())

    reopened = service.create_session(
        learner_id=learner_id,
        course_id="course-ds",
        topic_id="linked-list",
        policy="leap",
        experiment_group="D",
    )

    assert reopened["phase"] == "decision"
    assert reopened["assessmentStatus"] == "saved"
    assert reopened["diagnosis"]["evidenceIds"] == [original_evidence_id]
    assert "复用" in reopened["diagnosis"]["reason"]
    assert reopened["decision"] is not None
    assert reopened["state"]["evidenceCount"] == first["state"]["evidenceCount"]
    assert len(db.scalars(select(LearningEvidence)).all()) == evidence_count
    db.close()


def test_question_specific_misconception_codes_survive_practice_probe_and_retest(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    bank = _question_bank()
    for question in bank["questions"]:
        question["knowledgePointId"] = "kp-sorting-search"
        question["misconceptionCode"] = {
            "practice": "SS_SORT_STABILITY",
            "probe": "SS_SHELL_GAP",
            "retest": "SS_COUNTING_RANGE",
        }[question["stage"]]
    db, service = _service(tmp_path, monkeypatch, bank=bank)
    learner_id = "learner-question-misconception-codes"
    session = service.create_session(
        learner_id=learner_id,
        course_id="course-ds",
        topic_id="sorting-search",
        policy="leap",
        experiment_group="D",
    )
    session = service.diagnose(session["id"], learner_id, "误解答案", "a", 20)
    session = service.intervene(session["id"], learner_id, "contrastive_teaching")
    session = service.practice(
        session["id"], learner_id, "错答", "a", 20, hint_used=False
    )
    session = service.ready_probe(session["id"], learner_id)
    session = service.probe(session["id"], learner_id, "错答", "a", 20)

    row = db.get(AdaptiveSessionRecord, session["id"])
    row.retest_due_at = utc_now() - timedelta(days=1)
    db.commit()
    session = service.ready_retest(session["id"], learner_id)
    session = service.retest(session["id"], learner_id, "错答", "a", 20)

    assert {item["code"] for item in session["state"]["misconceptions"]} >= {
        "SS_SORT_STABILITY",
        "SS_SHELL_GAP",
        "SS_COUNTING_RANGE",
    }
    db.close()


@pytest.mark.parametrize(("first_hint", "retry_hint"), [(False, True), (True, False)])
def test_same_practice_assignment_replays_without_a_second_evidence_or_state_update(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    first_hint: bool,
    retry_hint: bool,
) -> None:
    db, service = _service(tmp_path, monkeypatch)
    learner_id = f"learner-practice-replay-{first_hint}"
    teaching = _start_teaching(service, learner_id)
    session_id = teaching["id"]

    first = service.practice(
        session_id,
        learner_id,
        answer="正确答案",
        option_id="b",
        duration_seconds=18,
        hint_used=first_hint,
    )
    assert first["evidence"][-1]["independent"] is False
    assert first["evidence"][-1]["countsForMastery"] is (not first_hint)
    evidence_count = len(
        db.scalars(
            select(LearningEvidence).where(
                LearningEvidence.session_id == session_id
            )
        ).all()
    )
    service.ready_probe(session_id, learner_id)
    persisted = service.get_session(session_id, learner_id)
    assert persisted["evidence"] == first["evidence"]

    replay = service.practice(
        session_id,
        learner_id,
        answer="正确答案",
        option_id="b",
        duration_seconds=18,
        hint_used=retry_hint,
    )

    assert replay["alreadyRecorded"] is True
    assert replay["evidence"] == first["evidence"]
    assert replay["state"] == first["state"]
    assert len(
        db.scalars(
            select(LearningEvidence).where(
                LearningEvidence.session_id == session_id
            )
        ).all()
    ) == evidence_count

    with pytest.raises(HTTPException) as changed_answer:
        service.practice(
            session_id,
            learner_id,
            answer="修改后的答案",
            option_id="a",
            duration_seconds=22,
            hint_used=False,
        )
    assert changed_answer.value.status_code == 409
    db.close()


def test_overview_rebuilds_state_from_verified_native_evidence_without_writing_cache(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db, service = _service(tmp_path, monkeypatch)
    learner_id = "learner-native-evidence"
    created = service.create_session(
        learner_id=learner_id,
        course_id="course-ds",
        topic_id="linked-list",
        policy="leap",
        experiment_group="D",
        time_budget_minutes=5,
    )
    cache = db.scalar(
        select(AdaptiveKnowledgeState).where(
            AdaptiveKnowledgeState.learner_id == learner_id,
            AdaptiveKnowledgeState.knowledge_point_id == "kp-linear-list",
        )
    )
    assert cache is not None
    initial_updated_at = cache.updated_at

    occurred_at = utc_now()
    canonical_payload = {
        "score": 0.0,
        "is_correct": False,
        "difficulty": 0.5,
        "grading_source": "server",
        "grading_version": "rubric-v1",
        "question_version": "test-bank-v1",
        "independent": True,
        "hint_used": False,
        "counts_for_mastery": True,
        "misconception_code": "LL_IGNORES_SEARCH_COST",
    }
    db.add_all([
        LearningEvidence(
            id=str(uuid4()),
            learner_id=learner_id,
            evidence_type="exam_answer_evaluated",
            source="exam_system",
            knowledge_point_id="kp-linear-list",
            course_id="course-ds",
            question_id="ds-exam-item-01",
            payload=json.dumps(canonical_payload),
            occurred_at=occurred_at,
        ),
        LearningEvidence(
            id=str(uuid4()),
            learner_id=learner_id,
            evidence_type="exam_answer_evaluated",
            source="exam_system",
            knowledge_point_id="kp-linear-list",
            course_id="course-ds",
            question_id="ds-exam-item-01",
            payload=json.dumps({**canonical_payload, "score": 1.0, "is_correct": True}),
            occurred_at=occurred_at + timedelta(seconds=1),
        ),
        LearningEvidence(
            id=str(uuid4()),
            learner_id=learner_id,
            evidence_type="practice_answer_evaluated",
            source="legacy-client",
            knowledge_point_id="kp-linear-list",
            course_id="course-ds",
            question_id="legacy-client-score",
            payload=json.dumps({"score": 1.0, "is_correct": True, "counts_for_mastery": True}),
            occurred_at=occurred_at + timedelta(seconds=2),
        ),
    ])
    db.commit()

    overview = service.overview(learner_id, "course-ds")
    projected = next(state for state in overview["states"] if state["knowledgePointId"] == "kp-linear-list")

    assert projected["evidenceCount"] == 1
    assert projected["mastery"] is not None
    assert projected["misconceptions"][0]["code"] == "LL_IGNORES_SEARCH_COST"
    db.refresh(cache)
    assert cache.evidence_count == 0
    assert cache.updated_at == initial_updated_at
    db.close()


def test_session_list_and_overview_do_not_assign_due_retest_questions(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db, service = _service(tmp_path, monkeypatch)
    learner_id = "learner-read-only-retest"
    session = service.create_session(
        learner_id=learner_id,
        course_id="course-ds",
        topic_id="linked-list",
        policy="leap",
        experiment_group="D",
        time_budget_minutes=5,
    )
    diagnosed = service.diagnose(
        session["id"], learner_id, "已知前驱，修改链接 O(1)", "b", 20
    )
    taught = service.intervene(diagnosed["id"], learner_id, "contrastive_teaching")
    prepared = service.ready_probe(taught["id"], learner_id)
    completed = service.probe(
        prepared["id"], learner_id, "已知前驱，修改链接 O(1)", "b", 20
    )
    row = db.get(AdaptiveSessionRecord, completed["id"])
    row.retest_due_at = utc_now() - timedelta(days=1)
    db.commit()
    db.refresh(row)
    snapshot_before = json.dumps(row.snapshot, sort_keys=True)
    updated_at_before = row.updated_at

    session_view = service.get_session(completed["id"], learner_id, "course-ds")
    listed = service.list_sessions(learner_id, "course-ds")
    overview = service.overview(learner_id, "course-ds")

    assert session_view["retestQuestion"] is None
    assert next(item for item in listed if item["id"] == completed["id"])["retestQuestion"] is None
    assert next(item for item in overview["sessions"] if item["id"] == completed["id"])["retestQuestion"] is None
    db.refresh(row)
    assert json.dumps(row.snapshot, sort_keys=True) == snapshot_before
    assert row.updated_at == updated_at_before
    db.close()


def test_probe_and_retest_return_saved_assessment_when_replanning_raises(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db, service = _service(tmp_path, monkeypatch)
    learner_id = "learner-plan-failure"
    session = service.create_session(
        learner_id=learner_id,
        course_id="course-ds",
        topic_id="linked-list",
        policy="leap",
        experiment_group="D",
        time_budget_minutes=5,
    )
    diagnosed = service.diagnose(
        session["id"], learner_id, "已知前驱，修改链接 O(1)", "b", 20
    )
    taught = service.intervene(diagnosed["id"], learner_id, "contrastive_teaching")
    prepared = service.ready_probe(taught["id"], learner_id)

    def fail_replan(*_args, **_kwargs):
        raise RuntimeError("planner unavailable")

    monkeypatch.setattr(adaptive_service_module.DynamicReplanningService, "replan", fail_replan)
    probed = service.probe(
        prepared["id"], learner_id, "已知前驱，修改链接 O(1)", "b", 20
    )
    assert probed["assessmentStatus"] == "saved"
    assert probed["replanning"]["status"] == "failed"
    assert probed["outcome"]["independent"] is True
    row = db.get(AdaptiveSessionRecord, probed["id"])
    assert row.phase == "completed"
    assert row.snapshot["assessmentStatus"] == "saved"
    assert row.snapshot["replanning"]["status"] == "failed"

    row.retest_due_at = utc_now() - timedelta(days=1)
    db.commit()
    service.ready_retest(probed["id"], learner_id)
    retested = service.retest(
        probed["id"], learner_id, "已知前驱，修改链接 O(1)", "b", 20
    )
    assert retested["assessmentStatus"] == "saved"
    assert retested["replanning"]["status"] == "failed"
    assert retested["outcome"]["retestScore"] is not None
    db.refresh(row)
    assert row.snapshot["assessmentStatus"] == "saved"
    assert row.snapshot["replanning"]["status"] == "failed"
    db.close()


def test_exhausted_practice_becomes_review_and_probe_stays_exhausted(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db, service = _service(
        tmp_path,
        monkeypatch,
        bank=_question_bank(practice_count=1, probe_count=1, retest_count=1),
    )
    learner_id = "learner-question-bank-exhausted"

    first = service.create_session(
        learner_id=learner_id,
        course_id="course-ds",
        topic_id="linked-list",
        policy="leap",
        experiment_group="D",
    )
    first = service.diagnose(first["id"], learner_id, "已知前驱 O(1)", "b", 20)
    first = service.intervene(first["id"], learner_id, "contrastive_teaching")
    first = service.ready_probe(first["id"], learner_id)

    second = service.create_session(
        learner_id=learner_id,
        course_id="course-ds",
        topic_id="linked-list",
        policy="leap",
        experiment_group="D",
    )
    second = service.diagnose(second["id"], learner_id, "已知前驱 O(1)", "b", 20)
    second = service.intervene(second["id"], learner_id, "contrastive_teaching")

    assert second["practiceQuestion"]["id"] == first["practiceQuestion"]["id"]
    assert second["practiceQuestion"]["novelty"] == "review"
    assert second["questionAvailability"]["practice"]["novelty"] == "review"
    reviewed = service.practice(
        second["id"], learner_id, "回顾答案", "b", 20, hint_used=False
    )
    assert reviewed["evidence"][-1]["independent"] is False
    assert reviewed["evidence"][-1]["countsForMastery"] is False

    exhausted = service.ready_probe(second["id"], learner_id)
    assert exhausted["phase"] == "teaching"
    assert exhausted["probeQuestion"] is None
    assert exhausted["questionAvailability"]["probe"]["status"] == "exhausted"
    db.close()


def test_submission_store_shares_item_key_and_answer_fingerprint(
    tmp_path: Path,
) -> None:
    from app.adaptive.submissions import AdaptiveQuestionSubmissionStore, answer_fingerprint

    engine = create_engine(f"sqlite:///{tmp_path / 'submission-store.db'}")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, autoflush=False, autocommit=False)()
    store = AdaptiveQuestionSubmissionStore(db)

    receipt = store.save_result(
        learner_id="learner-store",
        course_id="course-ds",
        knowledge_point_id="kp-linear-list",
        question_id="ds-linear-insert-practice-01",
        question_version="ds-bank-2026.10.14-v2",
        stage="practice",
        session_id="session-one",
        submission_id="course-ds:ds-linear-insert-practice-01:ds-bank-2026.10.14-v2",
        answer_hash=answer_fingerprint("", "b"),
        score=1.0,
        is_correct=True,
        difficulty=0.5,
        grading_source="server",
        grading_version="practice-rubric-v1",
        independent=True,
        hint_used=False,
        counts_for_mastery=True,
        misconception_code=None,
        evidence_id="evidence-one",
        result_json={"score": 1.0, "already_recorded": False},
    )

    assert receipt.assessment_item_key == "ds-linear-insert-practice-01@ds-bank-2026.10.14-v2"
    assert store.get_counted_item(
        "learner-store",
        "course-ds",
        "ds-linear-insert-practice-01",
        "ds-bank-2026.10.14-v2",
    ).id == receipt.id
    assert store.get_by_submission_id(
        "learner-store",
        "course-ds:ds-linear-insert-practice-01:ds-bank-2026.10.14-v2",
    ).id == receipt.id
    assert answer_fingerprint("ignored", "b") == sha256(b"b").hexdigest()
    db.close()
