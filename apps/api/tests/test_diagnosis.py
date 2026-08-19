"""Phase 2C 诊断测试 —— 覆盖 LearnerProfile / Diagnosis 的确定性领域规则。"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.seed import DEMO_LEARNER_ID, seed_demo_data
from app.db.session import SessionLocal, engine
from app.domain import Base, DiagnosisStatus
from app.domain.models import MasteryRecord
from app.main import create_app
from app.services.diagnosis_service import DiagnosisService
from app.services.knowledge_diagnosis_policy import KnowledgeDiagnosisPolicy
from app.services.learner_profile_service import LearnerProfileService
from app.services.priority_policy import PriorityPolicy

LEARNER = DEMO_LEARNER_ID
COURSE = "course-os"


def _mk_record(mastery: float, confidence: float, evidence_count: int) -> MasteryRecord:
    return MasteryRecord(
        id="x",
        learner_id=LEARNER,
        knowledge_point_id="kp-diag",
        mastery_score=mastery,
        confidence=confidence,
        evidence_count=evidence_count,
    )


def _policy() -> KnowledgeDiagnosisPolicy:
    return KnowledgeDiagnosisPolicy()


@pytest.fixture()
def client() -> TestClient:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)
    with TestClient(create_app()) as c:
        yield c


def _db():
    return SessionLocal()


# ---------------------------------------------------------------------------
# Test 1: evidence_count=0 & mastery/confidence=0 → UNASSESSED（绝不 WEAK）
# ---------------------------------------------------------------------------


def test_zero_evidence_is_unassessed_not_weak() -> None:
    result = _policy().diagnose(_mk_record(0.0, 0.0, 0), "kp")
    assert result.status == DiagnosisStatus.UNASSESSED
    assert result.status != DiagnosisStatus.WEAK


def test_no_record_is_unassessed() -> None:
    result = _policy().diagnose(None, "kp")
    assert result.status == DiagnosisStatus.UNASSESSED


# ---------------------------------------------------------------------------
# Test 2: 证据不足 → INSUFFICIENT_EVIDENCE
# ---------------------------------------------------------------------------


def test_insufficient_evidence() -> None:
    # confidence 未达阈值
    result = _policy().diagnose(_mk_record(0.3, 0.05, 3), "kp")
    assert result.status == DiagnosisStatus.INSUFFICIENT_EVIDENCE


# ---------------------------------------------------------------------------
# Test 3-6: 有足够证据时按 mastery 判定等级
# ---------------------------------------------------------------------------


def test_weak() -> None:
    result = _policy().diagnose(_mk_record(0.40, 0.5, 5), "kp")
    assert result.status == DiagnosisStatus.WEAK


def test_developing() -> None:
    result = _policy().diagnose(_mk_record(0.60, 0.5, 5), "kp")
    assert result.status == DiagnosisStatus.DEVELOPING


def test_proficient() -> None:
    result = _policy().diagnose(_mk_record(0.78, 0.6, 6), "kp")
    assert result.status == DiagnosisStatus.PROFICIENT


def test_mastered() -> None:
    result = _policy().diagnose(_mk_record(0.95, 0.7, 10), "kp")
    assert result.status == DiagnosisStatus.MASTERED


# ---------------------------------------------------------------------------
# Test 7: UNASSESSED 不能因 mastery=0 成为最高优先级弱点
# ---------------------------------------------------------------------------


def test_unassessed_not_priority_eligible() -> None:
    assert not PriorityPolicy.is_priority_eligible(DiagnosisStatus.UNASSESSED)
    assert not PriorityPolicy.is_priority_eligible(DiagnosisStatus.INSUFFICIENT_EVIDENCE)
    # 有足够证据的等级才可评估优先级
    assert PriorityPolicy.is_priority_eligible(DiagnosisStatus.WEAK)


# ---------------------------------------------------------------------------
# Test 8: 高 confidence 的真实低掌握度 → 更高优先级
# ---------------------------------------------------------------------------


def test_priority_reflects_confidence() -> None:
    low_conf = PriorityPolicy.compute(0.50, 0.3)
    high_conf = PriorityPolicy.compute(0.50, 0.8)
    assert high_conf > low_conf


# ---------------------------------------------------------------------------
# Test 9/10: overall_mastery 不把 UNASSESSED 当 0；无有效数据 → null
# ---------------------------------------------------------------------------


def test_overall_mastery_ignores_unassessed(client: TestClient) -> None:
    with _db() as db:
        service = LearnerProfileService(db)
        profile = service.build_profile(LEARNER, COURSE, "操作系统")
        # 只聚合有证据的 4 个知识点（进程调度未评估不参与）
        assert profile.assessed_count == 4
        assert profile.unassessed_count == 1
        assert profile.overall_mastery is not None
        assert 0.0 < profile.overall_mastery < 1.0


def test_overall_mastery_null_when_no_data(client: TestClient) -> None:
    # 用一个没有任何 Mastery 的课程（空课程）
    with _db() as db:
        service = LearnerProfileService(db)
        from app.services.knowledge_point_repository import KnowledgePointRepository
        kp_repo = KnowledgePointRepository(db)
        # 使用一个不存在的 course → 0 个知识点 → insufficient
        profile = service.build_profile(LEARNER, "course-none", "不存在")
        assert profile.insufficient_data is True
        assert profile.overall_mastery is None


# ---------------------------------------------------------------------------
# Test 11: coverage
# ---------------------------------------------------------------------------


def test_coverage_correct(client: TestClient) -> None:
    with _db() as db:
        service = LearnerProfileService(db)
        profile = service.build_profile(LEARNER, COURSE, "操作系统")
        assert profile.total_knowledge_points == 5
        assert profile.assessed_count == 4
        assert profile.coverage == pytest.approx(4 / 5)


# ---------------------------------------------------------------------------
# Test 12/13: primary_focus 来自最高合格 priority；无可靠弱点 → null
# ---------------------------------------------------------------------------


def test_primary_focus_from_highest_priority(client: TestClient) -> None:
    with _db() as db:
        service = DiagnosisService(db)
        result = service.diagnose_learner_course(LEARNER, COURSE, "操作系统")
        assert result.primary_focus is not None
        # primary_focus 必须是合格（有证据）状态
        assert result.primary_focus.status in (
            DiagnosisStatus.WEAK,
            DiagnosisStatus.DEVELOPING,
            DiagnosisStatus.PROFICIENT,
        )
        # 应为最高优先级
        max_priority = max(
            p.priority_score for p in result.priority_interventions
        ) if result.priority_interventions else 0
        assert result.primary_focus.priority_score >= max_priority


def test_primary_focus_null_when_no_reliable_weakness() -> None:
    # 全部高掌握度、足够证据 → 无薄弱 → primary_focus = null
    with _db() as db:
        from app.domain.models import KnowledgePoint
        records = [
            ("kp-a", 0.96, 0.8, 10),
            ("kp-b", 0.94, 0.8, 10),
        ]
        for kp_id, m, c, count in records:
            db.add(
                MasteryRecord(
                    id=kp_id,
                    learner_id="user-hi",
                    knowledge_point_id=kp_id,
                    mastery_score=m,
                    confidence=c,
                    evidence_count=count,
                )
            )
        db.commit()
        service = DiagnosisService(db)
        # course-none 无知识点，诊断为空
        result = service.diagnose_learner_course("user-hi", "course-none", "x")
        assert result.primary_focus is None


# ---------------------------------------------------------------------------
# Test 14: Practice 更新 Mastery 后 Diagnosis 反映最新值
# ---------------------------------------------------------------------------


def test_practice_update_reflected_in_diagnosis(client: TestClient) -> None:
    # 读取当前 kp-pv 诊断
    r1 = client.get(f"/api/diagnosis/{LEARNER}", params={"course_id": COURSE})
    pv1 = next(p for p in r1.json()["priority_interventions"] + r1.json()["strengths"] + r1.json()["weak_points"] + r1.json()["developing_points"] if p["knowledge_point_id"] == "kp-pv")
    m1 = pv1["mastery_score"]

    # 完成一次错误练习 → mastery 下降
    client.post(
        "/api/practice/evaluate",
        json={
            "learner_id": LEARNER,
            "course_id": COURSE,
            "knowledge_point_id": "kp-pv",
            "question_id": "q-p2c",
            "is_correct": False,
            "score": 0.0,
            "difficulty": 0.6,
        },
    )

    r2 = client.get(f"/api/diagnosis/{LEARNER}", params={"course_id": COURSE})
    pv2 = next(p for p in r2.json()["priority_interventions"] + r2.json()["strengths"] + r2.json()["weak_points"] + r2.json()["developing_points"] if p["knowledge_point_id"] == "kp-pv")
    m2 = pv2["mastery_score"]
    assert m2 < m1  # 错误练习后掌握度真实下降


# ---------------------------------------------------------------------------
# Test 15: 状态阈值边界（阈值 0.50 / 0.70 / 0.85 / 0.92 处无歧义）
# ---------------------------------------------------------------------------

# 边界值必须使用证据充分 + 高 confidence，确保判定仅由 mastery 决定。
# 阈值作为各段「独占上界」：mastery < 0.50 → WEAK；< 0.70 → DEVELOPING；
# < 0.85 → PROFICIENT；>= 0.85 → MASTERED（阈值本身归属上一档，转换无歧义）。
def test_boundary_weak_developing() -> None:
    # 0.4999 → WEAK；0.50 → DEVELOPING（0.50 即 DEVELOPING_THRESHOLD 段）
    assert _policy().diagnose(_mk_record(0.4999, 0.8, 5), "kp").status == DiagnosisStatus.WEAK
    assert (
        _policy().diagnose(_mk_record(0.50, 0.8, 5), "kp").status
        == DiagnosisStatus.DEVELOPING
    )


def test_boundary_developing_proficient() -> None:
    # 0.6999 → DEVELOPING；0.70 → PROFICIENT（0.70 即 PROFICIENT_THRESHOLD 段）
    assert (
        _policy().diagnose(_mk_record(0.6999, 0.8, 5), "kp").status
        == DiagnosisStatus.DEVELOPING
    )
    assert (
        _policy().diagnose(_mk_record(0.70, 0.8, 5), "kp").status
        == DiagnosisStatus.PROFICIENT
    )


def test_boundary_proficient_mastered() -> None:
    # 0.8499 → PROFICIENT；0.85 → MASTERED（0.85 即 MASTERED 段起点）
    assert (
        _policy().diagnose(_mk_record(0.8499, 0.8, 5), "kp").status
        == DiagnosisStatus.PROFICIENT
    )
    assert (
        _policy().diagnose(_mk_record(0.85, 0.8, 5), "kp").status
        == DiagnosisStatus.MASTERED
    )


def test_boundary_mastered() -> None:
    # 0.85 及以上均为 MASTERED（含 MASTERED_THRESHOLD=0.92 及之上）
    assert (
        _policy().diagnose(_mk_record(0.9199, 0.8, 5), "kp").status
        == DiagnosisStatus.MASTERED
    )
    assert (
        _policy().diagnose(_mk_record(0.92, 0.8, 5), "kp").status
        == DiagnosisStatus.MASTERED
    )


def test_boundary_extreme_float_guard() -> None:
    # 防御性：mastery 越界时不产生异常状态（不重复 MasteryUpdatePolicy 的 Clamp 职责）
    assert (
        _policy().diagnose(_mk_record(1.0000001, 0.8, 5), "kp").status
        == DiagnosisStatus.MASTERED
    )
    assert (
        _policy().diagnose(_mk_record(-0.00001, 0.8, 5), "kp").status
        == DiagnosisStatus.WEAK
    )


# ---------------------------------------------------------------------------
# Test 16: priority 始终落在 [0.0, 1.0]
# ---------------------------------------------------------------------------

def test_priority_bounded_to_unit_interval() -> None:
    # 极端输入也不越界
    assert PriorityPolicy.compute(0.0, 1.0) == 1.0
    assert PriorityPolicy.compute(1.0, 1.0) == 0.0
    assert PriorityPolicy.compute(0.0, 0.0) == 0.0
    assert PriorityPolicy.compute(-0.5, 1.0) == 1.0  # 防御性钳制
    assert PriorityPolicy.compute(0.5, 0.5) == 0.25


def test_priority_in_unit_interval_for_all_statuses() -> None:
    from app.services.diagnosis_service import DiagnosisService

    with _db() as db:
        service = DiagnosisService(db)
        result = service.diagnose_learner_course(LEARNER, COURSE, "操作系统")
        points = (
            list(result.priority_interventions)
            + list(result.strengths)
            + list(result.weak_points)
            + list(result.developing_points)
            + list(result.unassessed_points)
        )
        assert points
        for p in points:
            assert 0.0 <= p.priority_score <= 1.0


# ---------------------------------------------------------------------------
# Step 2 补充测试 —— LearnerProfile / Diagnosis 聚合语义固化
# ---------------------------------------------------------------------------

from app.domain.models import KnowledgePoint  # noqa: E402


def _add_course(db, course_id: str, kps: list[str]) -> None:
    """新建一门课程及其知识点（供隔离测试，不使用 Demo 数据）。"""
    for kp_id in kps:
        db.add(
            KnowledgePoint(
                id=kp_id, name=kp_id, course_id=course_id, difficulty=1
            )
        )


def _add_masteries(db, learner: str, rows: list[tuple[str, float, float, int]]) -> None:
    for kp_id, mastery, confidence, count in rows:
        db.add(
            MasteryRecord(
                id=kp_id,
                learner_id=learner,
                knowledge_point_id=kp_id,
                mastery_score=mastery,
                confidence=confidence,
                evidence_count=count,
            )
        )


# Test A：coverage 不能把 UNASSESSED 算作已评估（Demo 5 知识点，1 未评估）
def test_coverage_counts_only_assessed(client: TestClient) -> None:
    with _db() as db:
        profile = LearnerProfileService(db).build_profile(LEARNER, COURSE, "操作系统")
        assert profile.total_knowledge_points == 5
        assert profile.assessed_count == 4
        assert profile.coverage == pytest.approx(4 / 5)


# Test B：INSUFFICIENT_EVIDENCE 不能算正式 assessed
def test_insufficient_evidence_not_assessed(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-b", ["kp-b1", "kp-b2"])
        _add_masteries(
            db,
            "user-b",
            [
                ("kp-b1", 0.80, 0.50, 5),  # assessed (PROFICIENT)
                ("kp-b2", 0.10, 0.05, 3),  # confidence 不足 → INSUFFICIENT
            ],
        )
        db.commit()
        profile = LearnerProfileService(db).build_profile("user-b", "course-b", "cb")
        assert profile.total_knowledge_points == 2
        assert profile.assessed_count == 1
        assert profile.status_counts.insufficient_evidence == 1
        assert profile.coverage == pytest.approx(1 / 2)
        assert profile.unassessed_count == 1  # total - assessed（含 INSUFFICIENT）


# Test C：overall_mastery 不能包含 UNASSESSED（Demo 断言综合判定不为 0 拉低）
def test_overall_mastery_excludes_unassessed_demo(client: TestClient) -> None:
    with _db() as db:
        profile = LearnerProfileService(db).build_profile(LEARNER, COURSE, "操作系统")
        assert profile.overall_mastery is not None
        # UNASSESSED 的 kp-scheduling 必须出现在 knowledge_points 且状态为 UNASSESSED
        by_id = {kp.knowledge_point_id: kp for kp in profile.knowledge_points}
        assert "kp-scheduling" in by_id
        assert by_id["kp-scheduling"].status == DiagnosisStatus.UNASSESSED
        assert by_id["kp-scheduling"].priority_score == 0.0
        # 但 UNASSESSED 不参与 assessed 统计（从而不参与 overall_mastery 平均）
        assert profile.assessed_count == 4
        assert profile.status_counts.unassessed == 1


# Test D：overall_mastery 默认排除 INSUFFICIENT_EVIDENCE
def test_overall_mastery_excludes_insufficient(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-d", ["kp-d1", "kp-d2"])
        _add_masteries(
            db,
            "user-d",
            [
                ("kp-d1", 0.80, 0.50, 5),  # assessed
                ("kp-d2", 0.95, 0.05, 3),  # INSUFFICIENT（低 confidence）
            ],
        )
        db.commit()
        profile = LearnerProfileService(db).build_profile("user-d", "course-d", "cd")
        # 仅 kp-d1 参与聚合；kp-d2 的 0.95 高分不被计入
        assert profile.assessed_count == 1
        assert profile.status_counts.insufficient_evidence == 1
        assert profile.overall_mastery == pytest.approx(0.80)


# Test E：无正式 assessed 知识点 → overall_mastery = null（course 有知识点但全未评估）
def test_overall_mastery_null_no_assessed_points(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-e", ["kp-e1", "kp-e2"])  # 两个 UNASSESSED（无记录）
        db.commit()
        profile = LearnerProfileService(db).build_profile("user-e", "course-e", "ce")
        assert profile.total_knowledge_points == 2
        assert profile.assessed_count == 0
        assert profile.insufficient_data is True
        assert profile.overall_mastery is None          # 绝不返回 0.0
        assert profile.overall_confidence is None
        assert profile.coverage == 0.0


# Test F：confidence-weighted 聚合 —— 高 confidence 知识点拥有更大权重
def test_overall_mastery_confidence_weighted(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-f", ["kp-f1", "kp-f2"])
        _add_masteries(
            db,
            "user-f",
            [
                ("kp-f1", 0.50, 0.90, 5),  # 低掌握 + 高置信
                ("kp-f2", 0.90, 0.30, 5),  # 高掌握 + 低置信（仍足够评估）
            ],
        )
        db.commit()
        profile = LearnerProfileService(db).build_profile("user-f", "course-f", "cf")
        # (0.50*0.90 + 0.90*0.30) / (0.90+0.30) = 0.60；简单平均为 0.70
        assert profile.overall_mastery == pytest.approx(0.60)
        assert profile.overall_mastery < 0.70  # 高置信的低掌握被正确加权（贴近 0.50）


# Test G：status_counts 总和必须等于 total_knowledge_points
def test_status_counts_sum_equals_total(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-g", ["kp-g1", "kp-g2", "kp-g3"])
        _add_masteries(
            db,
            "user-g",
            [
                ("kp-g1", 0.40, 0.50, 5),  # WEAK
                ("kp-g2", 0.60, 0.50, 5),  # DEVELOPING
                ("kp-g3", 0.10, 0.05, 3),  # INSUFFICIENT
            ],
        )
        db.commit()
        profile = LearnerProfileService(db).build_profile("user-g", "course-g", "cg")
        sc = profile.status_counts
        total = profile.total_knowledge_points
        assert total == 3
        # 校核：Demo 课程（覆盖全部 6 种状态的分支）与自定义课程之和一致
        demo = LearnerProfileService(db).build_profile(LEARNER, COURSE, "操作系统")
        dsc = demo.status_counts
        assert (
            dsc.unassessed + dsc.insufficient_evidence + dsc.weak
            + dsc.developing + dsc.proficient + dsc.mastered
        ) == demo.total_knowledge_points
        assert (
            sc.unassessed + sc.insufficient_evidence + sc.weak
            + sc.developing + sc.proficient + sc.mastered
        ) == total


# Test H：primary_focus = 最高合法 priority_score 知识点
def test_primary_focus_is_max_priority(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-h", ["kp-h1", "kp-h2", "kp-h3"])
        _add_masteries(
            db,
            "user-h",
            [
                ("kp-h1", 0.46, 0.45, 3),  # WEAK, priority=(0.54*0.45)=0.243
                ("kp-h2", 0.55, 0.50, 4),  # DEVELOPING, priority=(0.45*0.50)=0.225
                ("kp-h3", 0.60, 0.50, 4),  # DEVELOPING, priority=(0.40*0.50)=0.20
            ],
        )
        db.commit()
        result = DiagnosisService(db).diagnose_learner_course("user-h", "course-h", "ch")
        assert result.primary_focus is not None
        assert result.primary_focus.knowledge_point_id == "kp-h1"
        assert result.primary_focus.priority_score == pytest.approx(0.54 * 0.45)
        all_prio = [p.priority_score for p in result.priority_interventions]
        assert result.primary_focus.priority_score >= max(all_prio)


# Test I：UNASSESSED 即便 mastery 表现为 0 也不能成为 primary_focus
def test_unassessed_never_primary_focus(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-i", ["kp-i-weak", "kp-i-un"])
        _add_masteries(
            db,
            "user-i",
            [
                ("kp-i-weak", 0.46, 0.45, 3),  # WEAK（真实弱点）
                # kp-i-un 无记录 → UNASSESSED，mastery 会表现为 0，但不得被选中
            ],
        )
        db.commit()
        result = DiagnosisService(db).diagnose_learner_course("user-i", "course-i", "ci")
        assert result.primary_focus is not None
        assert result.primary_focus.knowledge_point_id == "kp-i-weak"
        assert result.primary_focus.status == DiagnosisStatus.WEAK
        assert all(
            p.knowledge_point_id != "kp-i-un" for p in result.priority_interventions
        )


# Test J：INSUFFICIENT_EVIDENCE 不能因为低 mastery 成为 primary_focus
def test_insufficient_never_primary_focus(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-j", ["kp-j-insuf", "kp-j-weak"])
        _add_masteries(
            db,
            "user-j",
            [
                # 低掌握 + 低置信 → INSUFFICIENT；若按 mastery 排会是最高优先级
                ("kp-j-insuf", 0.05, 0.05, 3),
                # 真实弱点
                ("kp-j-weak", 0.46, 0.45, 3),
            ],
        )
        db.commit()
        result = DiagnosisService(db).diagnose_learner_course("user-j", "course-j", "cj")
        assert result.primary_focus is not None
        assert result.primary_focus.knowledge_point_id == "kp-j-weak"
        assert result.primary_focus.status == DiagnosisStatus.WEAK
        assert all(
            p.knowledge_point_id != "kp-j-insuf" for p in result.priority_interventions
        )
        # INSUFFICIENT 出现在 unassessed_points（需先评估）
        assert any(
            p.knowledge_point_id == "kp-j-insuf" for p in result.unassessed_points
        )


# Test K：全部 MASTERED → primary_focus = null（不为展示强行挑一个）
def test_all_mastered_primary_focus_null(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-k", ["kp-k1", "kp-k2"])
        _add_masteries(
            db,
            "user-k",
            [
                ("kp-k1", 0.95, 0.80, 10),
                ("kp-k2", 0.90, 0.80, 10),
            ],
        )
        db.commit()
        result = DiagnosisService(db).diagnose_learner_course("user-k", "course-k", "ck")
        assert result.primary_focus is None
        assert result.priority_interventions == []
        assert len(result.strengths) == 2


# Test L：Practice 更新 Mastery 后 Profile / Diagnosis 均读取最新状态
def test_practice_update_reflected_in_profile(client: TestClient) -> None:
    r1 = client.get(f"/api/profile/{LEARNER}", params={"course_id": COURSE})
    kp_map1 = {kp["knowledge_point_id"]: kp for kp in r1.json()["knowledge_points"]}
    pv1 = kp_map1["kp-pv"]["mastery_score"]
    om1 = r1.json()["overall_mastery"]

    client.post(
        "/api/practice/evaluate",
        json={
            "learner_id": LEARNER,
            "course_id": COURSE,
            "knowledge_point_id": "kp-pv",
            "question_id": "q-step2",
            "is_correct": False,
            "score": 0.0,
            "difficulty": 0.6,
        },
    )

    r2 = client.get(f"/api/profile/{LEARNER}", params={"course_id": COURSE})
    kp_map2 = {kp["knowledge_point_id"]: kp for kp in r2.json()["knowledge_points"]}
    pv2 = kp_map2["kp-pv"]["mastery_score"]
    om2 = r2.json()["overall_mastery"]

    assert pv2 < pv1            # 错误练习后掌握度下降
    assert om2 != om1           # overall_mastery 动态反映最新投影


# Test M：overall_confidence 始终落在 [0, 1]，且大量 UNASSESSED 会降低可信度
def test_overall_confidence_in_unit_interval(client: TestClient) -> None:
    with _db() as db:
        _add_course(db, "course-m", ["kp-m1", "kp-m2", "kp-m3", "kp-m4", "kp-m5", "kp-m6", "kp-m7", "kp-m8", "kp-m9", "kp-m10"])
        _add_masteries(
            db,
            "user-m",
            [("kp-m1", 0.80, 0.90, 10)],  # 仅 1/10 评估，高置信
        )
        db.commit()
        profile = LearnerProfileService(db).build_profile(
            "user-m", "course-m", "cm"
        )
        # 只评估 1/10，即使置信 0.9，overall_confidence 也被 coverage 大幅拉低
        assert profile.overall_confidence is not None
        assert 0.0 <= profile.overall_confidence <= 1.0
        assert profile.overall_confidence <= 0.1 * 0.9

    # Demo 课程 also in [0,1]
    with _db() as db:
        profile = LearnerProfileService(db).build_profile(LEARNER, COURSE, "操作系统")
        if profile.overall_confidence is not None:
            assert 0.0 <= profile.overall_confidence <= 1.0
