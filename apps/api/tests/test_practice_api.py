from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.db.session import get_db
from app.domain import Base, LearningEvidence, MasteryRecord
from app.main import create_app
from app.practice import catalog as practice_catalog
from tests.seed_fixtures import TEST_LEARNER_ID, seed_test_data


def make_client(tmp_path: Path) -> tuple[TestClient, object, object]:
    engine = create_engine(
        f"sqlite:///{tmp_path / 'practice-api.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = factory()
    seed_test_data(session)

    def override_get_db():
        yield session

    application = create_app()
    application.dependency_overrides[get_db] = override_get_db
    return TestClient(application), session, engine


def test_practice_catalog_only_returns_practice_question_fields(tmp_path: Path) -> None:
    client, session, engine = make_client(tmp_path)
    response = client.get(
        "/api/practice/questions",
        params={
            "learner_id": TEST_LEARNER_ID,
            "course_id": "course-os",
            "knowledge_point_id": "kp-deadlock",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["version"] == "course-os-practice-2026.10.14-v1"
    assert [question["id"] for question in body["questions"]] == [
        "question-deadlock-001",
        "question-deadlock-002",
        "question-deadlock-003",
    ]
    question = body["questions"][0]
    assert question["knowledgePointId"] == "kp-deadlock"
    assert set(question) == {
        "id",
        "version",
        "knowledgePointId",
        "objectiveId",
        "prompt",
        "options",
        "recordedResult",
    }
    assert question["recordedResult"] is None
    assert all(set(option) == {"id", "label"} for option in question["options"])

    ds_catalog = client.get(
        "/api/practice/questions",
        params={
            "learner_id": TEST_LEARNER_ID,
            "course_id": "course-ds",
            "knowledge_point_id": "kp-linear-list",
        },
    )
    assert ds_catalog.status_code == 200
    assert ds_catalog.json()["version"] == "ds-bank-2026.10.14-v2"
    assert len(ds_catalog.json()["questions"]) == 4
    assert all("correctOptionId" not in item for item in ds_catalog.json()["questions"])

    empty_other_course = client.get(
        "/api/practice/questions",
        params={
            "learner_id": TEST_LEARNER_ID,
            "course_id": "course-net",
            "knowledge_point_id": "kp-tcp-udp",
        },
    )
    assert empty_other_course.status_code == 200
    assert empty_other_course.json()["questions"] == []

    client.close()
    session.close()
    engine.dispose()


def test_server_scores_and_replays_question_once_across_sessions(tmp_path: Path) -> None:
    client, session, engine = make_client(tmp_path)
    payload = {
        "learner_id": TEST_LEARNER_ID,
        "course_id": "course-os",
        "knowledge_point_id": "kp-deadlock",
        "question_id": "question-deadlock-001",
        "option_id": "c",
        "session_id": "first-session",
    }
    first = client.post("/api/practice/evaluate", json=payload)
    assert first.status_code == 200
    first_body = first.json()
    assert first_body["is_correct"] is True
    assert first_body["score"] == 1.0
    assert first_body["grading_version"] == "server-objective-choice-v1"
    assert first_body["already_recorded"] is False
    assert "option_id" not in first_body
    assert "正确" in first_body["feedback"]

    evidence_id = first_body["evidence"]["id"]
    evidence = session.get(LearningEvidence, evidence_id)
    assert evidence is not None
    assert evidence.payload
    assert '"grading_source": "server"' in evidence.payload
    assert '"question_version": "course-os-practice-2026.10.14-v1"' in evidence.payload
    assert '"counts_for_mastery": true' in evidence.payload
    assert '"independent": false' in evidence.payload
    assert '"option_id": "c"' in evidence.payload
    assert '"answer": "可抢占"' in evidence.payload

    restored_catalog = client.get(
        "/api/practice/questions",
        params={
            "learner_id": TEST_LEARNER_ID,
            "course_id": "course-os",
            "knowledge_point_id": "kp-deadlock",
        },
    ).json()
    recorded = restored_catalog["questions"][0]["recordedResult"]
    assert recorded == {
        "optionId": "c",
        "isCorrect": True,
        "score": 1.0,
        "feedback": first_body["feedback"],
    }

    other_learner_catalog = client.get(
        "/api/practice/questions",
        params={
            "learner_id": "another-learner",
            "course_id": "course-os",
            "knowledge_point_id": "kp-deadlock",
        },
    ).json()
    assert all(item["recordedResult"] is None for item in other_learner_catalog["questions"])
    count_after_first = session.scalar(
        select(MasteryRecord.evidence_count).where(
            MasteryRecord.learner_id == TEST_LEARNER_ID,
            MasteryRecord.knowledge_point_id == "kp-deadlock",
        )
    )

    retry = client.post(
        "/api/practice/evaluate",
        json={**payload, "session_id": "different-session"},
    )
    assert retry.status_code == 200
    assert retry.json()["already_recorded"] is True
    assert retry.json()["evidence"]["id"] == evidence_id
    assert retry.json()["score"] == first_body["score"]
    count_after_retry = session.scalar(
        select(MasteryRecord.evidence_count).where(
            MasteryRecord.learner_id == TEST_LEARNER_ID,
            MasteryRecord.knowledge_point_id == "kp-deadlock",
        )
    )
    assert count_after_retry == count_after_first

    changed_answer = client.post(
        "/api/practice/evaluate", json={**payload, "option_id": "a"}
    )
    assert changed_answer.status_code == 409
    assert session.query(LearningEvidence).filter_by(
        learner_id=TEST_LEARNER_ID,
        course_id="course-os",
        question_id="question-deadlock-001",
    ).count() == 1

    client.close()
    session.close()
    engine.dispose()


def test_leap_practice_receipt_replays_through_native_practice(tmp_path: Path) -> None:
    client, session, engine = make_client(tmp_path)
    learner_id = "learner-shared-practice-receipt"
    created = client.post(
        "/api/adaptive/sessions",
        json={
            "learnerId": learner_id,
            "courseId": "course-ds",
            "topicId": "linked-list",
            "policy": "leap",
            "experimentGroup": "D",
        },
    )
    assert created.status_code == 201
    session_id = created.json()["id"]
    diagnosed = client.post(
        f"/api/adaptive/sessions/{session_id}/diagnose",
        json={"answer": "随机访问", "optionId": "wrong", "durationSeconds": 20},
    )
    assert diagnosed.status_code == 200
    taught = client.post(
        f"/api/adaptive/sessions/{session_id}/intervene",
        json={"actionType": "contrastive_teaching"},
    )
    assert taught.status_code == 200
    question_id = taught.json()["practiceQuestion"]["id"]

    bank_path = Path(__file__).resolve().parents[1] / "app" / "practice" / "data" / "course-ds.json"
    question = next(
        item
        for item in json.loads(bank_path.read_text(encoding="utf-8"))["questions"]
        if item["id"] == question_id
    )
    option_id = question["correctOptionId"]
    option_label = next(item["label"] for item in question["options"] if item["id"] == option_id)
    practiced = client.post(
        f"/api/adaptive/sessions/{session_id}/practice",
        json={
            "answer": option_label,
            "optionId": option_id,
            "durationSeconds": 25,
            "hintUsed": False,
        },
    )
    assert practiced.status_code == 200
    assert practiced.json()["alreadyRecorded"] is False

    evidence = session.scalars(
        select(LearningEvidence).where(
            LearningEvidence.learner_id == learner_id,
            LearningEvidence.course_id == "course-ds",
            LearningEvidence.question_id == question_id,
        )
    ).one()
    saved_payload = json.loads(evidence.payload)
    mastery_before_replay = session.scalar(
        select(MasteryRecord).where(
            MasteryRecord.learner_id == learner_id,
            MasteryRecord.knowledge_point_id == "kp-linear-list",
        )
    )
    assert mastery_before_replay is not None

    submission = {
        "learner_id": learner_id,
        "course_id": "course-ds",
        "knowledge_point_id": "kp-linear-list",
        "question_id": question_id,
        "option_id": option_id,
    }
    replay = client.post("/api/practice/evaluate", json=submission)
    assert replay.status_code == 200
    replay_body = replay.json()
    assert replay_body["already_recorded"] is True
    assert replay_body["evidence"]["id"] == evidence.id
    assert replay_body["mastery_before"] == saved_payload["mastery_before"]
    assert replay_body["mastery_after"] == saved_payload["mastery_after"]
    assert replay_body["confidence"] == saved_payload["confidence"]
    assert replay_body["evidence_count"] == saved_payload["evidence_count"]

    legacy_payload = {
        key: value
        for key, value in saved_payload.items()
        if key not in {"mastery_before", "mastery_after", "evidence_count"}
    }
    legacy_payload.update(
        {
            "masteryBefore": saved_payload["mastery_before"],
            "masteryAfter": saved_payload["mastery_after"],
            "evidenceCount": saved_payload["evidence_count"],
        }
    )
    evidence.payload = json.dumps(legacy_payload, ensure_ascii=False)
    session.commit()
    legacy_replay = client.post("/api/practice/evaluate", json=submission)
    assert legacy_replay.status_code == 200
    assert legacy_replay.json()["mastery_before"] == saved_payload["mastery_before"]
    assert legacy_replay.json()["mastery_after"] == saved_payload["mastery_after"]
    assert legacy_replay.json()["evidence_count"] == saved_payload["evidence_count"]

    session.refresh(mastery_before_replay)
    assert mastery_before_replay.evidence_count == saved_payload["evidence_count"]
    restored = client.get(
        "/api/practice/questions",
        params={
            "learner_id": learner_id,
            "course_id": "course-ds",
            "knowledge_point_id": "kp-linear-list",
        },
    )
    assert restored.status_code == 200
    recorded = next(
        item for item in restored.json()["questions"] if item["id"] == question_id
    )["recordedResult"]
    assert recorded["optionId"] == option_id
    assert recorded["isCorrect"] is True
    assert recorded["score"] == 1.0

    client.close()
    session.close()
    engine.dispose()


def test_hint_practice_receipt_is_visible_and_not_counted_by_native_practice(tmp_path: Path) -> None:
    client, session, engine = make_client(tmp_path)
    learner_id = "learner-hint-shared-practice"
    created = client.post(
        "/api/adaptive/sessions",
        json={
            "learnerId": learner_id,
            "courseId": "course-ds",
            "topicId": "linked-list",
            "policy": "leap",
            "experimentGroup": "D",
        },
    )
    session_id = created.json()["id"]
    diagnosed = client.post(
        f"/api/adaptive/sessions/{session_id}/diagnose",
        json={"answer": "随机访问", "optionId": "wrong", "durationSeconds": 20},
    )
    assert diagnosed.status_code == 200
    mastery_before_hint = session.scalar(
        select(MasteryRecord).where(
            MasteryRecord.learner_id == learner_id,
            MasteryRecord.knowledge_point_id == "kp-linear-list",
        )
    )
    assert mastery_before_hint is not None
    evidence_count_before_hint = mastery_before_hint.evidence_count
    taught = client.post(
        f"/api/adaptive/sessions/{session_id}/intervene",
        json={"actionType": "contrastive_teaching"},
    )
    question_id = taught.json()["practiceQuestion"]["id"]
    bank_path = Path(__file__).resolve().parents[1] / "app" / "practice" / "data" / "course-ds.json"
    question = next(
        item
        for item in json.loads(bank_path.read_text(encoding="utf-8"))["questions"]
        if item["id"] == question_id
    )
    wrong_option_id = next(
        option["id"] for option in question["options"]
        if option["id"] != question["correctOptionId"]
    )
    wrong_label = next(
        option["label"] for option in question["options"] if option["id"] == wrong_option_id
    )
    hinted = client.post(
        f"/api/adaptive/sessions/{session_id}/practice",
        json={
            "answer": wrong_label,
            "optionId": wrong_option_id,
            "durationSeconds": 30,
            "hintUsed": True,
        },
    )
    assert hinted.status_code == 200
    assert hinted.json()["alreadyRecorded"] is False
    evidence = session.scalars(
        select(LearningEvidence).where(
            LearningEvidence.learner_id == learner_id,
            LearningEvidence.question_id == question_id,
        )
    ).one()
    session.refresh(mastery_before_hint)
    assert mastery_before_hint.evidence_count == evidence_count_before_hint

    catalog = client.get(
        "/api/practice/questions",
        params={
            "learner_id": learner_id,
            "course_id": "course-ds",
            "knowledge_point_id": "kp-linear-list",
        },
    ).json()
    restored = next(item for item in catalog["questions"] if item["id"] == question_id)["recordedResult"]
    assert restored["optionId"] == wrong_option_id
    assert restored["isCorrect"] is False

    native = client.post(
        "/api/practice/evaluate",
        json={
            "learner_id": learner_id,
            "course_id": "course-ds",
            "knowledge_point_id": "kp-linear-list",
            "question_id": question_id,
            "option_id": question["correctOptionId"],
        },
    )
    assert native.status_code == 200
    assert native.json()["already_recorded"] is True
    assert native.json()["is_correct"] is False
    assert native.json()["evidence"]["id"] == evidence.id
    assert session.query(LearningEvidence).filter_by(
        learner_id=learner_id,
        course_id="course-ds",
        question_id=question_id,
    ).count() == 1
    session.refresh(mastery_before_hint)
    assert mastery_before_hint.evidence_count == evidence_count_before_hint

    client.close()
    session.close()
    engine.dispose()


def test_known_course_catalog_missing_file_raises_read_error(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(practice_catalog, "DATA_DIR", tmp_path)
    try:
        practice_catalog.PracticeCatalog().load("course-os")
    except FileNotFoundError:
        pass
    else:
        raise AssertionError("missing required course catalog should raise")


def test_public_practice_rejects_client_scored_payload_and_unknown_question(
    tmp_path: Path,
) -> None:
    client, session, engine = make_client(tmp_path)
    payload = {
        "learner_id": TEST_LEARNER_ID,
        "course_id": "course-os",
        "knowledge_point_id": "kp-pv",
        "question_id": "question-pv-demo-001",
        "option_id": "a",
    }
    forged = client.post(
        "/api/practice/evaluate",
        json={**payload, "is_correct": False, "score": 0.0, "difficulty": 0.0},
    )
    assert forged.status_code == 422
    assert session.query(LearningEvidence).count() == 0

    unknown = client.post(
        "/api/practice/evaluate", json={**payload, "question_id": "client-invented-q"}
    )
    assert unknown.status_code == 404
    assert session.query(LearningEvidence).count() == 0

    client.close()
    session.close()
    engine.dispose()
