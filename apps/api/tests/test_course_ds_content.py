from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict, deque
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = API_ROOT / "app"
sys.path.insert(0, str(API_ROOT))

from app.adaptive.catalog import (  # noqa: E402
    CATALOG_VERSION,
    POLICY_VERSION,
    QUESTION_BANKS,
    QUESTION_VERSION,
    TOPICS,
    catalog_payload,
    public_question,
)

CURRICULUM_PATH = APP_ROOT / "curriculum" / "course_ds.json"
BANK_PATH = APP_ROOT / "practice" / "data" / "course-ds.json"
EXPECTED_IDS = {
    "kp-ds-complexity",
    "kp-linear-list",
    "kp-stack-queue",
    "kp-recursion",
    "kp-strings",
    "kp-trees",
    "kp-heaps",
    "kp-graphs",
    "kp-sorting-search",
    "kp-hashing",
}
EXPECTED_STAGES = {"practice": 4, "probe": 2, "retest": 2}
LEGACY_TOPICS = {"linked-list", "stack-queue", "bst", "graph-search"}


def _json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def test_canonical_materials_sources_and_prerequisite_dag():
    curriculum = _json(CURRICULUM_PATH)
    points = curriculum["knowledgePoints"]
    point_by_id = {point["id"]: point for point in points}

    assert curriculum["courseId"] == "course-ds"
    assert curriculum["version"] == "course-ds-2026.10.14-v2"
    assert curriculum["reviewStatus"] == "pending_human_review"
    assert set(point_by_id) == EXPECTED_IDS
    assert len(points) == 10
    assert sorted(point["order"] for point in points) == list(range(1, 11))

    children: dict[str, list[str]] = defaultdict(list)
    indegree = {point_id: 0 for point_id in point_by_id}
    objective_ids: dict[str, set[str]] = {}
    material_names: set[str] = set()

    for point in points:
        assert point["material"] not in material_names
        material_names.add(point["material"])
        assert point["difficulty"] in {1, 2, 3, 4, 5}
        assert point["objectives"]
        ids = {objective["id"] for objective in point["objectives"]}
        assert len(ids) == len(point["objectives"])
        objective_ids[point["id"]] = ids

        for prerequisite in point["prerequisiteIds"]:
            assert prerequisite in point_by_id
            children[prerequisite].append(point["id"])
            indegree[point["id"]] += 1

        assert point["sourceRefs"]
        for source in point["sourceRefs"]:
            assert source["title"] and source["locator"]
            assert source["url"].startswith("https://")
            assert source["verificationStatus"] in {"reference_checked", "reference_only"}

        material = APP_ROOT / "knowledge" / "materials" / "course-ds" / point["material"]
        text = material.read_text(encoding="utf-8")
        assert f"knowledge_point_id: {point['id']}" in text
        assert point["name"] in text.splitlines()[3]
        assert not any(line.startswith("+") for line in text.splitlines()), material.name
        assert "## 学习目标" in text
        assert "## 参考来源与状态" in text
        assert text.count("### 例") >= 2, material.name
        for objective_id in ids:
            assert objective_id in text, (material.name, objective_id)

    ready = deque(point_id for point_id, degree in indegree.items() if degree == 0)
    visited: list[str] = []
    while ready:
        point_id = ready.popleft()
        visited.append(point_id)
        for child in children[point_id]:
            indegree[child] -= 1
            if indegree[child] == 0:
                ready.append(child)
    assert set(visited) == EXPECTED_IDS, "prerequisite graph must be acyclic"


def test_practice_bank_schema_answers_sources_and_stage_coverage():
    bank = _json(BANK_PATH)
    questions = bank["questions"]
    point_by_id = {point["id"]: point for point in _json(CURRICULUM_PATH)["knowledgePoints"]}
    assert bank["version"] == "ds-bank-2026.10.14-v2"
    assert len(questions) == 80
    assert len({question["id"] for question in questions}) == 80
    assert len({(question["knowledgePointId"], question["prompt"]) for question in questions}) == 80

    counts = Counter((question["knowledgePointId"], question["stage"]) for question in questions)
    for point_id, point in point_by_id.items():
        for stage, expected_count in EXPECTED_STAGES.items():
            assert counts[(point_id, stage)] == expected_count
        objective_ids = {objective["id"] for objective in point["objectives"]}
        for question in (q for q in questions if q["knowledgePointId"] == point_id):
            assert question["courseId"] == "course-ds"
            assert question["version"] == bank["version"]
            assert question["objectiveId"] in objective_ids
            assert question["stage"] in EXPECTED_STAGES
            assert question["prompt"].strip()
            assert question["explanation"].strip()
            assert 0.0 <= question["difficulty"] <= 1.0
            assert len(question["options"]) == 4
            option_ids = [option["id"] for option in question["options"]]
            assert len(set(option_ids)) == len(option_ids)
            assert question["correctOptionId"] in option_ids
            assert question["sourceRefs"]
            for ref in question["sourceRefs"]:
                course_and_point, objective_id = ref.split("#", 1)
                course_id, referenced_point = course_and_point.split(":", 1)
                assert course_id == "course-ds"
                assert referenced_point == point_id
                assert objective_id in objective_ids


def test_adaptive_topics_keep_legacy_ids_and_hide_internal_item_metadata():
    assert CATALOG_VERSION == "course-ds-leap-2026.10.14-v2"
    assert POLICY_VERSION == "leap-ranking-2026.10.14-v2"
    assert QUESTION_VERSION == "ds-bank-2026.10.14-v2"
    assert LEGACY_TOPICS <= set(TOPICS)
    assert set(TOPICS) == LEGACY_TOPICS | {"sorting-search"}

    point_ids = EXPECTED_IDS
    catalog = catalog_payload()
    assert catalog["reviewStatus"] == "pending_human_review"
    assert {topic["id"] for topic in catalog["topics"]} == set(TOPICS)

    for topic in TOPICS.values():
        assert topic["prerequisiteIds"]
        assert set(topic["prerequisiteIds"]) <= point_ids
        assert {item["id"] for item in topic["prerequisites"]} <= point_ids
        assert topic["diagnostic"]["version"] == QUESTION_VERSION
        for stages in QUESTION_BANKS[topic["id"]].values():
            for spec in stages:
                assert spec["version"] == QUESTION_VERSION
                code = spec["misconceptionCode"]
                codes = {item["code"] for item in topic["misconceptions"]} if topic.get("misconceptions") else {topic["misconceptionCode"]}
                assert code in codes

    public = public_question(QUESTION_BANKS["sorting-search"]["probe"][0])
    assert {"version", "misconceptionCode", "correctOptionId", "rubric", "rubricGroups"}.isdisjoint(public)
    assert set(public) == {"id", "prompt", "options", "responseMode"}