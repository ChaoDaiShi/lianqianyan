"""Demo Seed —— 为比赛演示建立初始领域数据。

原则：
- Demo 数据通过显式 Seed 建立，绝不把 Demo 逻辑写进业务 Repository。
- Demo Baseline（MasteryRecord）与真实 LearningEvidence 语义分离：
  这里**不伪造** LearningEvidence 历史，只初始化带有合理置信/证据数的 MasteryRecord 基线，
  并标注为 demo baseline。
- 用户后续真实学习行为会通过 LearningEvidence → 投影更新这些状态。
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.domain.models import Course, KnowledgePoint, MasteryRecord

# 演示学习者（比赛 Demo 唯一用户）
DEMO_LEARNER_ID = "demo-user-001"

# 演示课程
DEMO_COURSES = [
    {"id": "course-os", "name": "操作系统", "description": "软件设计师备考 · 操作系统"},
]

# 操作系统课程知识点（仅支撑诊断 Demo，非完整知识图谱）
DEMO_KNOWLEDGE_POINTS = [
    {"id": "kp-process-concept", "name": "进程基础", "course_id": "course-os", "difficulty": 2},
    {"id": "kp-process-sync", "name": "进程同步", "course_id": "course-os", "difficulty": 4},
    {"id": "kp-pv", "name": "PV 操作", "course_id": "course-os", "difficulty": 4},
    {"id": "kp-deadlock", "name": "死锁", "course_id": "course-os", "difficulty": 4},
    {"id": "kp-scheduling", "name": "进程调度", "course_id": "course-os", "difficulty": 3},
]

# Demo 掌握度基线（demo baseline，非伪造学习行为；evidence_count 表示等价的有效评估次数）
DEMO_MASTERY_BASELINE = [
    # 进程基础 —— 掌握较好（有足够证据）
    {"knowledge_point_id": "kp-process-concept", "mastery_score": 0.82, "confidence": 0.63, "evidence_count": 5},
    # 进程同步 —— 有一定状态
    {"knowledge_point_id": "kp-process-sync", "mastery_score": 0.60, "confidence": 0.50, "evidence_count": 4},
    # PV 操作 —— 发展中（与首页 58% 一致）
    {"knowledge_point_id": "kp-pv", "mastery_score": 0.58, "confidence": 0.25, "evidence_count": 1},
    # 死锁 —— 少量 Demo 评估，薄弱
    {"knowledge_point_id": "kp-deadlock", "mastery_score": 0.46, "confidence": 0.45, "evidence_count": 3},
    # 进程调度 —— 未评估（不创建记录 → UNASSESSED）
]


def _seed_course_and_kps(db: Session) -> None:
    for course in DEMO_COURSES:
        if db.get(Course, course["id"]) is None:
            db.add(Course(id=course["id"], name=course["name"], description=course["description"]))
    for kp in DEMO_KNOWLEDGE_POINTS:
        if db.get(KnowledgePoint, kp["id"]) is None:
            db.add(
                KnowledgePoint(
                    id=kp["id"],
                    name=kp["name"],
                    course_id=kp["course_id"],
                    difficulty=kp["difficulty"],
                )
            )


def _seed_mastery_baseline(db: Session) -> None:
    for item in DEMO_MASTERY_BASELINE:
        existing = db.query(MasteryRecord).filter(
            MasteryRecord.learner_id == DEMO_LEARNER_ID,
            MasteryRecord.knowledge_point_id == item["knowledge_point_id"],
        ).first()
        if existing is None:
            now = datetime.utcnow()
            db.add(
                MasteryRecord(
                    id=str(uuid.uuid4()),
                    learner_id=DEMO_LEARNER_ID,
                    knowledge_point_id=item["knowledge_point_id"],
                    mastery_score=item["mastery_score"],
                    confidence=item["confidence"],
                    evidence_count=item["evidence_count"],
                    created_at=now,
                    updated_at=now,
                )
            )


def seed_demo_data(db: Session) -> None:
    """写入 / 补全演示初始数据（幂等：已存在则跳过）。"""
    _seed_course_and_kps(db)
    _seed_mastery_baseline(db)
    db.commit()
