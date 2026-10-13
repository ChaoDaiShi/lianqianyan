"""Versioned curriculum metadata shared by catalog seeding and knowledge retrieval."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def data_structures_curriculum() -> dict:
    return json.loads(Path(__file__).with_name("course_ds.json").read_text(encoding="utf-8"))


def curriculum_for(course_id: str) -> dict | None:
    return data_structures_curriculum() if course_id == "course-ds" else None


def point_metadata(course_id: str, knowledge_point_id: str) -> dict:
    curriculum = curriculum_for(course_id)
    if curriculum is None:
        return {}
    return next((point for point in curriculum["knowledgePoints"] if point["id"] == knowledge_point_id), {})
