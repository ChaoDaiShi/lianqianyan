"""Inventory or remove the retired fixed learner from an explicit SQLite file."""

from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

LEGACY_LEARNER_ID = "demo-user-001"


@dataclass(frozen=True)
class CleanupReport:
    database_path: Path
    learner_id: str
    applied: bool
    before_counts: dict[str, int]
    after_counts: dict[str, int]
    backup_path: Path | None

    @property
    def total_matches(self) -> int:
        return sum(self.before_counts.values())


COUNT_QUERIES = {
    "exam_answers": (
        {"exam_answers", "exam_attempts"},
        """SELECT COUNT(*) FROM exam_answers
           WHERE attempt_id IN (
             SELECT id FROM exam_attempts WHERE learner_id = ?
           )""",
    ),
    "exam_attempts": (
        {"exam_attempts"},
        "SELECT COUNT(*) FROM exam_attempts WHERE learner_id = ?",
    ),
    "study_tasks": (
        {"study_tasks", "study_plans"},
        """SELECT COUNT(*) FROM study_tasks
           WHERE plan_id IN (
             SELECT id FROM study_plans WHERE learner_id = ?
           )""",
    ),
    "study_plans": (
        {"study_plans"},
        "SELECT COUNT(*) FROM study_plans WHERE learner_id = ?",
    ),
    "learning_evidence": (
        {"learning_evidence"},
        "SELECT COUNT(*) FROM learning_evidence WHERE learner_id = ?",
    ),
    "mastery_records": (
        {"mastery_records"},
        "SELECT COUNT(*) FROM mastery_records WHERE learner_id = ?",
    ),
    "learner_profiles": (
        {"learner_profiles"},
        "SELECT COUNT(*) FROM learner_profiles WHERE user_id = ?",
    ),
    "users": (
        {"users"},
        "SELECT COUNT(*) FROM users WHERE id = ?",
    ),
}

DELETE_QUERIES = {
    "exam_answers": """DELETE FROM exam_answers
        WHERE attempt_id IN (
          SELECT id FROM exam_attempts WHERE learner_id = ?
        )""",
    "exam_attempts": "DELETE FROM exam_attempts WHERE learner_id = ?",
    "study_tasks": """DELETE FROM study_tasks
        WHERE plan_id IN (
          SELECT id FROM study_plans WHERE learner_id = ?
        )""",
    "study_plans": "DELETE FROM study_plans WHERE learner_id = ?",
    "learning_evidence": "DELETE FROM learning_evidence WHERE learner_id = ?",
    "mastery_records": "DELETE FROM mastery_records WHERE learner_id = ?",
    "learner_profiles": "DELETE FROM learner_profiles WHERE user_id = ?",
    "users": "DELETE FROM users WHERE id = ?",
}


def _validate_database_path(database_path: Path) -> Path:
    if not database_path.is_absolute():
        raise ValueError("database path must be absolute")
    resolved = database_path.resolve(strict=True)
    if not resolved.is_file():
        raise ValueError("database path must identify a file")
    with resolved.open("rb") as database_file:
        if database_file.read(16) != b"SQLite format 3\x00":
            raise ValueError("database file is not SQLite")
    return resolved


def _read_only_connection(database_path: Path) -> sqlite3.Connection:
    uri = f"file:{database_path.as_posix()}?mode=ro"
    connection = sqlite3.connect(uri, uri=True)
    connection.execute("PRAGMA query_only = ON")
    return connection


def _table_names(connection: sqlite3.Connection) -> set[str]:
    return {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }


def _counts(connection: sqlite3.Connection) -> dict[str, int]:
    available_tables = _table_names(connection)
    counts: dict[str, int] = {}
    for name, (required_tables, query) in COUNT_QUERIES.items():
        counts[name] = (
            int(connection.execute(query, (LEGACY_LEARNER_ID,)).fetchone()[0])
            if required_tables.issubset(available_tables)
            else 0
        )
    return counts


def _backup(database_path: Path) -> Path:
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    backup_path = database_path.with_name(
        f"{database_path.name}.pre-anonymous-{timestamp}.bak"
    )
    try:
        shutil.copy2(database_path, backup_path)
    except PermissionError:
        with _read_only_connection(database_path) as source:
            with sqlite3.connect(backup_path) as destination:
                source.backup(destination)
    return backup_path


def remove_legacy_demo_learner(
    database_path: Path,
    *,
    apply: bool,
) -> CleanupReport:
    """Inventory or delete only the exact retired learner and dependent rows."""
    resolved = _validate_database_path(database_path)
    with _read_only_connection(resolved) as connection:
        before_counts = _counts(connection)

    if not apply or sum(before_counts.values()) == 0:
        return CleanupReport(
            database_path=resolved,
            learner_id=LEGACY_LEARNER_ID,
            applied=False,
            before_counts=before_counts,
            after_counts=dict(before_counts),
            backup_path=None,
        )

    backup_path = _backup(resolved)
    connection = sqlite3.connect(resolved, timeout=10)
    try:
        connection.execute("PRAGMA busy_timeout = 10000")
        connection.execute("BEGIN IMMEDIATE")
        available_tables = _table_names(connection)
        for name, (required_tables, _) in COUNT_QUERIES.items():
            if required_tables.issubset(available_tables):
                connection.execute(DELETE_QUERIES[name], (LEGACY_LEARNER_ID,))
        after_counts = _counts(connection)
        if any(after_counts.values()):
            raise RuntimeError("legacy learner rows remain after allowlisted cleanup")
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    return CleanupReport(
        database_path=resolved,
        learner_id=LEGACY_LEARNER_ID,
        applied=True,
        before_counts=before_counts,
        after_counts=after_counts,
        backup_path=backup_path,
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Inventory or remove the retired demo-user-001 SQLite rows.",
    )
    parser.add_argument("--database", required=True, type=Path)
    parser.add_argument("--apply", action="store_true")
    arguments = parser.parse_args()
    report = remove_legacy_demo_learner(
        arguments.database,
        apply=arguments.apply,
    )
    payload = asdict(report)
    payload["database_path"] = str(report.database_path)
    payload["backup_path"] = (
        str(report.backup_path) if report.backup_path is not None else None
    )
    payload["total_matches"] = report.total_matches
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
