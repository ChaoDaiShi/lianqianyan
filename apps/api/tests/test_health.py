"""Education API 测试 —— 覆盖 LearningEvidence → MasteryProjection 链路。

每个测试使用独立重置的数据库，避免相互干扰。
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.seed_fixtures import TEST_LEARNER_ID, seed_test_data
from app.db.session import SessionLocal, engine
from app.domain import Base
from app.main import create_app

# 固定演示学习者
LEARNER = TEST_LEARNER_ID


@pytest.fixture()
def client() -> TestClient:
    # 重置数据库：drop + create + 重新 Seed，保证每用例独立、可控。
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_test_data(db)
    with TestClient(create_app()) as c:
        yield c


def fetch_mastery(client: TestClient, learner: str, kp: str) -> dict:
    return client.get(f"/api/profile/mastery/{kp}", params={"learner_id": learner}).json()


def evaluate(
    client: TestClient,
    *,
    learner: str,
    kp: str,
    question_id: str,
    option_id: str,
):
    return client.post(
        "/api/practice/evaluate",
        json={
            "learner_id": learner,
            "course_id": "course-os",
            "knowledge_point_id": kp,
            "question_id": question_id,
            "option_id": option_id,
        },
    )


def test_health_endpoint(client: TestClient) -> None:
    """GET /api/health 应返回 ok + service 名。"""
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "education-api"


def test_demo_seed_exists(client: TestClient) -> None:
    """Demo Seed：test-learner-001 + kp-pv 初始掌握度应为 0.58。"""
    body = fetch_mastery(client, LEARNER, "kp-pv")
    assert body["mastery_score"] == 0.58
    assert body["confidence"] == pytest.approx(0.25)
    assert body["evidence_count"] == 1


# ---------------------------------------------------------------------------
# Test 1: learning_started（行为证据）不改掌握度
# ---------------------------------------------------------------------------


def test_learning_started_does_not_change_mastery(client: TestClient) -> None:
    """learning_started 证据应正常持久化，但不改变 mastery / confidence / count。"""
    before = fetch_mastery(client, LEARNER, "kp-pv")

    response = client.post(
        "/api/learning/start",
        params={
            "learner_id": LEARNER,
            "source": "current_study_plan",
            "knowledge_point_id": "kp-pv",
            "topic": "进程同步",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["evidence"]["evidence_type"] == "learning_started"

    after = fetch_mastery(client, LEARNER, "kp-pv")
    assert after["mastery_score"] == pytest.approx(before["mastery_score"])
    assert after["confidence"] == pytest.approx(before["confidence"])
    assert after["evidence_count"] == before["evidence_count"]


def test_learning_started_evidence_is_persisted(client: TestClient) -> None:
    """learning_started 证据应通过 /api/learning/evidence 真正持久化。

    回归：start_learning 路由作为写操作业务事务边界需 commit，
    避免「返回 evidence 对象但 DB 未落盘」的半成功状态。
    """
    response = client.post(
        "/api/learning/start",
        params={
            "learner_id": LEARNER,
            "source": "current_study_plan",
            "knowledge_point_id": "kp-pv",
            "course_id": "course-os",
            "topic": "进程同步",
        },
    )
    assert response.status_code == 201

    evidence = client.get("/api/learning/evidence").json()
    persisted = [e for e in evidence if e["evidence_type"] == "learning_started"]
    assert len(persisted) == 1
    assert persisted[0]["learner_id"] == LEARNER
    assert persisted[0]["knowledge_point_id"] == "kp-pv"


# ---------------------------------------------------------------------------
# Test 2 / 3: 正确 / 错误练习
# ---------------------------------------------------------------------------


def test_correct_practice_increases_mastery(client: TestClient) -> None:
    """答对：mastery_after > mastery_before。"""
    response = evaluate(
        client,
        learner=LEARNER,
        kp="kp-pv",
        question_id="question-pv-demo-001",
        option_id="a",
    )
    assert response.status_code == 200
    body = response.json()
    assert body["evidence"]["evidence_type"] == "practice_answer_evaluated"
    assert body["mastery_after"] > body["mastery_before"]
    assert body["evidence_count"] >= 1


def test_wrong_practice_decreases_mastery(client: TestClient) -> None:
    """答错：mastery_after < mastery_before（需先建立非零掌握度基线）。"""
    kp = "kp-pv"
    # 先答对建立非零基线
    evaluate(
        client,
        learner=LEARNER,
        kp=kp,
        question_id="question-pv-demo-001",
        option_id="a",
    )
    baseline = fetch_mastery(client, LEARNER, kp)["mastery_score"]
    assert baseline > 0.0

    response = evaluate(
        client,
        learner=LEARNER,
        kp=kp,
        question_id="question-pv-demo-002",
        option_id="a",
    )
    assert response.status_code == 200
    body = response.json()
    assert body["mastery_after"] < body["mastery_before"]
    assert body["evidence_count"] >= 2


# ---------------------------------------------------------------------------
# Test 4: Clamp 0 ~ 1
# ---------------------------------------------------------------------------


def test_mastery_stays_bounded_with_unique_catalog_items(client: TestClient) -> None:
    """Distinct catalog items are scored once and projected mastery stays bounded."""
    kp = "kp-pv"
    for question_id, option_id in (
        ("question-pv-demo-001", "a"),
        ("question-pv-demo-002", "b"),
        ("question-pv-demo-003", "c"),
        ("question-pv-demo-004", "d"),
        ("question-pv-demo-005", "a"),
    ):
        response = evaluate(
            client,
            learner=LEARNER,
            kp=kp,
            question_id=question_id,
            option_id=option_id,
        )
        assert 0.0 <= response.json()["mastery_after"] <= 1.0

    body = fetch_mastery(client, LEARNER, kp)
    assert 0.0 <= body["mastery_score"] <= 1.0


# ---------------------------------------------------------------------------
# Test 5: confidence 单调不减、不越界
# ---------------------------------------------------------------------------


def test_confidence_increases_with_assessments(client: TestClient) -> None:
    """有效 assessment 证据增加后 confidence 不应下降，且保持在 0~1。"""
    kp = "kp-pv"
    confidences = []
    for question_id, option_id in (
        ("question-pv-demo-001", "a"),
        ("question-pv-demo-002", "b"),
        ("question-pv-demo-003", "c"),
        ("question-pv-demo-004", "d"),
    ):
        evaluate(
            client,
            learner=LEARNER,
            kp=kp,
            question_id=question_id,
            option_id=option_id,
        )
        body = fetch_mastery(client, LEARNER, kp)
        confidences.append(body["confidence"])
        assert 0.0 <= body["confidence"] <= 1.0
    # 单调不减
    assert confidences == sorted(confidences)
    # 证据越多置信越高
    assert confidences[-1] > confidences[0]


# ---------------------------------------------------------------------------
# Test 6: evidence_count 只由 assessment 证据增加
# ---------------------------------------------------------------------------


def test_evidence_count_only_incremented_by_assessment(client: TestClient) -> None:
    """learning_started 不计入 assessment evidence_count。"""
    kp = "kp-pv"
    before = fetch_mastery(client, LEARNER, kp)
    # 行为证据不会改变已有掌握记录中的有效评价计数。
    for _ in range(3):
        client.post(
            "/api/learning/start",
            params={"learner_id": LEARNER, "source": "recommended_path", "knowledge_point_id": kp, "course_id": "course-os"},
        )
    after_behavior = fetch_mastery(client, LEARNER, kp)
    assert after_behavior["evidence_count"] == before["evidence_count"]

    # 一次新的有效评价后 count 仅增加 1
    evaluate(
        client,
        learner=LEARNER,
        kp=kp,
        question_id="question-pv-demo-005",
        option_id="a",
    )
    body = fetch_mastery(client, LEARNER, kp)
    assert body["evidence_count"] == before["evidence_count"] + 1


# ---------------------------------------------------------------------------
# Test 7: 禁止客户端提交评分事实
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "field,value",
    [("is_correct", False), ("score", 0.0), ("difficulty", 0.1)],
)
def test_client_scored_fields_are_rejected(client: TestClient, field: str, value) -> None:
    """Client-derived correctness, score and difficulty are not public inputs."""
    data = {
        "learner_id": LEARNER,
        "course_id": "course-os",
        "knowledge_point_id": "kp-pv",
        "question_id": "question-pv-demo-001",
        "option_id": "a",
    }
    data[field] = value
    response = client.post("/api/practice/evaluate", json=data)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Test 8: 非法 Evidence Source 被拒绝
# ---------------------------------------------------------------------------


def test_invalid_evidence_source_rejected(client: TestClient) -> None:
    """未知 source 应被 Pydantic 拒绝（枚举枚举校验）。"""
    response = client.post(
        "/api/learning/start",
        params={"learner_id": LEARNER, "source": "not_a_real_source"},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Test 9: 服务端生成 evidence id / occurred_at
# ---------------------------------------------------------------------------


def test_server_generates_id_and_timestamp(client: TestClient) -> None:
    """practice evaluate 返回的 evidence id 由服务端生成且 occurred_at 存在。"""
    response = evaluate(
        client,
        learner=LEARNER,
        kp="kp-pv",
        question_id="question-pv-demo-005",
        option_id="a",
    )
    assert response.status_code == 200
    evidence = response.json()["evidence"]
    assert evidence["id"]
    assert evidence["occurred_at"]


# ---------------------------------------------------------------------------
# Test 10: 事务一致性 —— Evidence 与 Mastery 同一次业务操作
# ---------------------------------------------------------------------------


def test_evidence_and_mastery_transaction_consistency(client: TestClient) -> None:
    """一次 evaluate 应同时产生 Evidence 与 Mastery 更新，且二者一致。"""
    kp = "kp-deadlock"
    response = evaluate(
        client,
        learner=LEARNER,
        kp=kp,
        question_id="question-deadlock-001",
        option_id="c",
    )
    assert response.status_code == 200
    body = response.json()

    # Evidence 已持久化
    evidence_list = client.get("/api/learning/evidence").json()
    created = [e for e in evidence_list if e["knowledge_point_id"] == kp]
    assert len(created) == 1
    assert created[0]["evidence_type"] == "practice_answer_evaluated"

    # Mastery 已持久化且与响应一致
    mastery_body = fetch_mastery(client, LEARNER, kp)
    assert mastery_body["mastery_score"] == pytest.approx(body["mastery_after"])
    assert mastery_body["evidence_count"] == body["evidence_count"]
