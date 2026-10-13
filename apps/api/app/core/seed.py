"""Idempotent seed for shared course catalog data.

Application startup may create curriculum metadata that is identical for every learner.
It must never create learner-scoped mastery, evidence, plans, exam attempts, or chat data.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain.models import Course, KnowledgePoint
from app.curriculum import data_structures_curriculum

DEFAULT_COURSE_ID = "course-os"

CATALOG_COURSES = [
    {
        "id": DEFAULT_COURSE_ID,
        "name": "操作系统",
        "description": "软件设计师备考 · 操作系统",
    },
    {
        "id": "course-net",
        "name": "计算机网络",
        "description": "软件设计师备考 · 计算机网络",
    },
    {
        "id": "course-ds",
        "name": "数据结构与算法",
        "description": "软件设计师备考 · 数据结构与算法",
    },
]

CATALOG_KNOWLEDGE_POINTS = [
    {
        "id": "kp-process-concept",
        "name": "进程基础",
        "course_id": DEFAULT_COURSE_ID,
        "difficulty": 2,
    },
    {
        "id": "kp-process-sync",
        "name": "进程同步",
        "course_id": DEFAULT_COURSE_ID,
        "difficulty": 4,
    },
    {
        "id": "kp-pv",
        "name": "PV 操作",
        "course_id": DEFAULT_COURSE_ID,
        "difficulty": 4,
    },
    {
        "id": "kp-deadlock",
        "name": "死锁",
        "course_id": DEFAULT_COURSE_ID,
        "difficulty": 4,
    },
    {
        "id": "kp-scheduling",
        "name": "进程调度",
        "course_id": DEFAULT_COURSE_ID,
        "difficulty": 3,
    },
    {
        "id": "kp-osi-model",
        "name": "OSI 与 TCP/IP 分层",
        "course_id": "course-net",
        "difficulty": 2,
    },
    {
        "id": "kp-ip-addressing",
        "name": "IP 地址与子网划分",
        "course_id": "course-net",
        "difficulty": 3,
    },
    {
        "id": "kp-tcp-udp",
        "name": "TCP 与 UDP",
        "course_id": "course-net",
        "difficulty": 3,
    },
    {
        "id": "kp-routing",
        "name": "交换与路由基础",
        "course_id": "course-net",
        "difficulty": 3,
    },
    {
        "id": "kp-network-security",
        "name": "网络安全基础",
        "course_id": "course-net",
        "difficulty": 4,
    },
]

CATALOG_KNOWLEDGE_POINTS.extend(
    {
        "id": point["id"], "name": point["name"], "course_id": "course-ds",
        "difficulty": point["difficulty"],
    }
    for point in data_structures_curriculum()["knowledgePoints"]
)


def _seed_course_and_knowledge_points(db: Session) -> None:
    for course in CATALOG_COURSES:
        if db.get(Course, course["id"]) is None:
            db.add(
                Course(
                    id=course["id"],
                    name=course["name"],
                    description=course["description"],
                )
            )

    for knowledge_point in CATALOG_KNOWLEDGE_POINTS:
        existing = db.get(KnowledgePoint, knowledge_point["id"])
        if existing is None:
            db.add(
                KnowledgePoint(
                    id=knowledge_point["id"],
                    name=knowledge_point["name"],
                    course_id=knowledge_point["course_id"],
                    difficulty=knowledge_point["difficulty"],
                )
            )
        elif knowledge_point["course_id"] == "course-ds":
            existing.name = knowledge_point["name"]
            existing.difficulty = knowledge_point["difficulty"]


def seed_catalog_data(db: Session) -> None:
    """Create shared catalog rows only; never create learner-scoped state."""
    _seed_course_and_knowledge_points(db)
    db.commit()
