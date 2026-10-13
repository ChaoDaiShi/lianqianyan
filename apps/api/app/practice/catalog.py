from __future__ import annotations

import json
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).with_name("data")
COURSE_DATA_FILES = {
    "course-os": "course-os.json",
    "course-ds": "course-ds.json",
}


class PracticeCatalog:
    """Read stage-tagged question JSON without exposing answer material publicly."""

    def load(self, course_id: str) -> dict[str, Any]:
        file_name = COURSE_DATA_FILES.get(course_id)
        if file_name is None:
            return {"version": "empty", "questions": []}
        path = DATA_DIR / file_name
        return json.loads(path.read_text(encoding="utf-8"))

    def list_practice(self, course_id: str, knowledge_point_id: str) -> dict[str, Any]:
        catalog = self.load(course_id)
        questions = [
            question
            for question in catalog.get("questions", [])
            if question.get("courseId") == course_id
            and question.get("knowledgePointId") == knowledge_point_id
            and question.get("stage") == "practice"
        ]
        return {"version": catalog.get("version", "empty"), "questions": questions}

    def get_practice_question(
        self,
        course_id: str,
        knowledge_point_id: str,
        question_id: str,
    ) -> dict[str, Any] | None:
        return next(
            (
                question
                for question in self.list_practice(course_id, knowledge_point_id)["questions"]
                if question.get("id") == question_id
            ),
            None,
        )


def public_catalog(
    catalog: dict[str, Any],
    recorded_results: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Project only the learner-safe question fields from the server catalog."""
    recorded_results = recorded_results or {}
    return {
        "version": catalog["version"],
        "questions": [
            {
                "id": question["id"],
                "version": question["version"],
                "knowledgePointId": question["knowledgePointId"],
                "objectiveId": question["objectiveId"],
                "prompt": question["prompt"],
                "options": [
                    {"id": option["id"], "label": option["label"]}
                    for option in question["options"]
                ],
                "recordedResult": recorded_results.get(question["id"]),
            }
            for question in catalog["questions"]
        ],
    }
