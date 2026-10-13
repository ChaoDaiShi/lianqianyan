from __future__ import annotations

from pathlib import Path
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.adaptive.models import AdaptiveSessionRecord
from app.core.time import utc_now
from app.db.session import get_db
from app.domain import Base, LearningEvidence, MasteryRecord
from app.main import create_app


def test_leap_session_persists_evidence_and_requires_independent_probe(
    tmp_path: Path,
) -> None:
    engine = create_engine(
        f"sqlite:///{tmp_path / 'adaptive.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = factory()

    def override_get_db():
        yield session

    application = create_app()
    application.dependency_overrides[get_db] = override_get_db
    client = TestClient(application)

    catalog = client.get("/api/adaptive/catalog").json()
    assert catalog["reviewStatus"] == "pending_human_review"
    assert {topic["id"] for topic in catalog["topics"]} == {
        "linked-list",
        "stack-queue",
        "bst",
        "graph-search",
    }
    topics = {topic["id"]: topic for topic in catalog["topics"]}
    assert topics["linked-list"]["name"] == "单链表插入复杂度"
    assert topics["linked-list"]["misconceptionTitle"] == "忽略插入前的定位成本"
    assert topics["linked-list"]["diagnosticQuestion"]["id"] == "ds-ll-diagnostic-q07"
    assert topics["linked-list"]["diagnosticQuestion"]["responseMode"] == "choice"
    assert {strategy["type"]: strategy["minutes"] for strategy in topics["linked-list"]["strategies"]} == {
        "diagnostic_probe": 3,
        "contrastive_teaching": 5,
        "prerequisite_repair": 8,
        "guided_practice": 6,
        "transfer_challenge": 8,
        "retrieval_practice": 4,
    }

    created = client.post(
        "/api/adaptive/sessions",
        json={
            "learnerId": "learner-adaptive-1",
            "courseId": "course-ds",
            "topicId": "linked-list",
            "policy": "leap",
            "experimentGroup": "D",
            "timeBudgetMinutes": 3,
        },
    ).json()
    session_id = created["id"]
    assert created["phase"] == "diagnostic"
    assert "correctAnswer" not in created["diagnosticQuestion"]

    diagnosed = client.post(
        f"/api/adaptive/sessions/{session_id}/diagnose",
        json={"answer": "随机访问", "optionId": "wrong", "durationSeconds": 35},
    ).json()
    assert diagnosed["phase"] == "decision"
    assert diagnosed["diagnosis"]["misconceptionCode"]
    assert diagnosed["decision"]["actionType"] == "contrastive_teaching"
    assert len(diagnosed["decision"]["candidates"]) == 6
    candidates = {candidate["actionType"]: candidate for candidate in diagnosed["decision"]["candidates"]}
    assert candidates["contrastive_teaching"]["factors"]["misconception"] == 1.0
    assert candidates["guided_practice"]["factors"]["misconception"] == 0.65
    assert candidates["diagnostic_probe"]["factors"]["misconception"] == 0.45
    assert candidates["transfer_challenge"]["factors"]["misconception"] == 0.3
    assert candidates["contrastive_teaching"]["factors"]["time"] == 0.6
    assert candidates["contrastive_teaching"]["factors"]["cost"] == round(5 / 30, 3)

    taught = client.post(
        f"/api/adaptive/sessions/{session_id}/intervene",
        json={"actionType": "contrastive_teaching"},
    ).json()
    assert taught["phase"] == "teaching"
    assert [panel["label"] for panel in taught["teaching"]["panels"]] == ["情形 A", "情形 B"]
    assert [panel["complexity"] for panel in taught["teaching"]["panels"]] == ["O(1)", "O(n)"]
    assert taught["practiceQuestion"] is not None

    practiced = client.post(
        f"/api/adaptive/sessions/{session_id}/practice",
        json={
            "answer": "从头沿 next 指针逐个访问，成本 O(n)",
            "durationSeconds": 32,
            "hintUsed": True,
        },
    ).json()
    assert practiced["phase"] == "teaching"
    assert practiced["state"]["evidenceCount"] == diagnosed["state"]["evidenceCount"]

    prepared = client.post(f"/api/adaptive/sessions/{session_id}/ready-probe", json={}).json()
    assert prepared["phase"] == "probe"
    assert prepared["probeQuestion"] is not None
    assert prepared["probeQuestion"]["id"] != taught["practiceQuestion"]["id"]

    probed = client.post(
        f"/api/adaptive/sessions/{session_id}/probe",
        json={
            "answer": "若先定位/查找前驱，最坏 O(n)；已经知道前驱结点后改指针插入 O(1)",
            "durationSeconds": 52,
        },
    ).json()
    assert probed["outcome"]["independent"] is True
    assert probed["outcome"]["hintUsed"] is False
    assert probed["outcome"]["correct"] is True
    assert probed["outcome"]["misconceptionStatus"] == "repaired"
    assert probed["phase"] == "completed"
    assert probed["retestDueAt"] is not None

    early_retest = client.post(
        f"/api/adaptive/sessions/{session_id}/retest",
        json={"answer": "顺序遍历", "durationSeconds": 30},
    )
    assert early_retest.status_code == 409

    saved = session.get(AdaptiveSessionRecord, session_id)
    saved.retest_due_at = utc_now() - timedelta(days=1)
    session.commit()
    due = client.get(f"/api/adaptive/sessions/{session_id}").json()
    assert due["retestQuestion"] is not None
    assert due["retestQuestion"]["id"] != probed["probeQuestion"]["id"]
    retested = client.post(
        f"/api/adaptive/sessions/{session_id}/retest",
        json={
            "answer": "先定位时要从头顺序访问 O(n)；找到前驱后修改链接为 O(1)",
            "durationSeconds": 38,
        },
    ).json()
    assert retested["outcome"]["retestScore"] == 1.0

    evidence = session.scalars(
        select(LearningEvidence).where(LearningEvidence.session_id == session_id)
    ).all()
    assert {record.knowledge_point_id for record in evidence} == {"kp-linear-list"}
    assert any(record.evidence_type == "practice_answer_evaluated" for record in evidence)
    assert session.scalars(
        select(MasteryRecord).where(
            MasteryRecord.learner_id == "learner-adaptive-1",
            MasteryRecord.knowledge_point_id == "kp-linear-list",
        )
    ).first() is not None
    mastery = session.scalars(
        select(MasteryRecord).where(
            MasteryRecord.learner_id == "learner-adaptive-1",
            MasteryRecord.knowledge_point_id == "kp-linear-list",
        )
    ).first()
    assert mastery.evidence_count == 3

    restored = client.get(f"/api/adaptive/sessions/{session_id}").json()
    assert restored["id"] == session_id
    assert restored["outcome"]["questionId"] == probed["probeQuestion"]["id"]
    assert restored["outcome"]["retestScore"] == 1.0
    overview = client.get(
        "/api/adaptive/overview",
        params={"learner_id": "learner-adaptive-1", "course_id": "course-ds"},
    ).json()
    assert overview["stats"]["independentCorrect"] == 1
    assert overview["stats"]["independentTotal"] == 1
    assert overview["experiments"][3]["count"] == 1
    assert overview["experiments"][3]["retentionMean"] == 1.0
    exported = client.get(
        "/api/adaptive/experiments/export",
        params={"learner_id": "learner-adaptive-1", "course_id": "course-ds"},
    ).json()
    assert exported["sessions"][0]["id"] == session_id
    assert retested["nextStep"]["actionType"] == "diagnostic_probe"

    next_topic = client.post(
        "/api/adaptive/sessions",
        json={
            "learnerId": "learner-adaptive-1",
            "courseId": "course-ds",
            "topicId": "linked-list",
            "policy": "fixed",
            "experimentGroup": "A",
            "ablation": "ranking",
            "fromSessionId": session_id,
        },
    ).json()
    assert next_topic["topicId"] == "stack-queue"
    assert next_topic["phase"] == "diagnostic"
    assert next_topic["experimentGroup"] == "D"
    assert next_topic["policy"] == "leap"
    next_diagnosis = client.post(
        f"/api/adaptive/sessions/{next_topic['id']}/diagnose",
        json={"answer": "队列 FIFO，最早进入的请求最先处理", "optionId": "b", "durationSeconds": 22},
    ).json()
    assert "diagnostic_probe" in next_diagnosis["decision"]["reason"]

    source_row = session.get(AdaptiveSessionRecord, session_id)
    source_snapshot = dict(source_row.snapshot)
    source_snapshot["nextStep"] = {
        "title": "继续修复单链表插入定位成本",
        "reason": "再次区分定位和指针修改。",
        "actionType": "contrastive_teaching",
        "topicId": "linked-list",
    }
    source_row.snapshot = source_snapshot
    session.commit()
    same_topic = client.post(
        "/api/adaptive/sessions",
        json={
            "learnerId": "learner-adaptive-1",
            "courseId": "course-ds",
            "topicId": "linked-list",
            "policy": "fixed",
            "experimentGroup": "A",
            "fromSessionId": session_id,
        },
    ).json()
    assert same_topic["topicId"] == "linked-list"
    assert same_topic["phase"] == "decision"
    assert same_topic["decision"]["actionType"] == "contrastive_teaching"
    same_topic_record = session.get(AdaptiveSessionRecord, same_topic["id"])
    assert same_topic_record.pre_score == 1.0

    client.close()
    session.close()
    engine.dispose()
