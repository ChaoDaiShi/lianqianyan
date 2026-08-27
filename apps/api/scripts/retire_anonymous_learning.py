"""Inventory or retire every legacy ``anon:*`` learner from one explicit SQLite DB."""

from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

ANONYMOUS_PATTERN = "anon:%"

COUNT_QUERIES = {
    "exam_answers": ({"exam_answers", "exam_attempts"}, "SELECT COUNT(*) FROM exam_answers WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE learner_id LIKE ?)") ,
    "exam_attempts": ({"exam_attempts"}, "SELECT COUNT(*) FROM exam_attempts WHERE learner_id LIKE ?"),
    "study_tasks": ({"study_tasks", "study_plans"}, "SELECT COUNT(*) FROM study_tasks WHERE plan_id IN (SELECT id FROM study_plans WHERE learner_id LIKE ?)") ,
    "study_plans": ({"study_plans"}, "SELECT COUNT(*) FROM study_plans WHERE learner_id LIKE ?"),
    "learning_evidence": ({"learning_evidence"}, "SELECT COUNT(*) FROM learning_evidence WHERE learner_id LIKE ?"),
    "mastery_records": ({"mastery_records"}, "SELECT COUNT(*) FROM mastery_records WHERE learner_id LIKE ?"),
    "learner_profiles": ({"learner_profiles"}, "SELECT COUNT(*) FROM learner_profiles WHERE user_id LIKE ?"),
    "users": ({"users"}, "SELECT COUNT(*) FROM users WHERE id LIKE ?"),
}

DELETE_QUERIES = {
    "exam_answers": "DELETE FROM exam_answers WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE learner_id LIKE ?)",
    "exam_attempts": "DELETE FROM exam_attempts WHERE learner_id LIKE ?",
    "study_tasks": "DELETE FROM study_tasks WHERE plan_id IN (SELECT id FROM study_plans WHERE learner_id LIKE ?)",
    "study_plans": "DELETE FROM study_plans WHERE learner_id LIKE ?",
    "learning_evidence": "DELETE FROM learning_evidence WHERE learner_id LIKE ?",
    "mastery_records": "DELETE FROM mastery_records WHERE learner_id LIKE ?",
    "learner_profiles": "DELETE FROM learner_profiles WHERE user_id LIKE ?",
    "users": "DELETE FROM users WHERE id LIKE ?",
}


@dataclass(frozen=True)
class RetirementReport:
    database_path: Path
    applied: bool
    before_counts: dict[str, int]
    after_counts: dict[str, int]
    backup_path: Path | None

    @property
    def total_matches(self) -> int:
        return sum(self.before_counts.values())


def _validate(path: Path) -> Path:
    if not path.is_absolute():
        raise ValueError("database path must be absolute")
    resolved = path.resolve(strict=True)
    if not resolved.is_file() or resolved.read_bytes()[:16] != b"SQLite format 3\x00":
        raise ValueError("database file is not SQLite")
    return resolved


def _tables(connection: sqlite3.Connection) -> set[str]:
    return {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}


def _counts(connection: sqlite3.Connection) -> dict[str, int]:
    tables = _tables(connection)
    return {
        name: int(connection.execute(query, (ANONYMOUS_PATTERN,)).fetchone()[0]) if required.issubset(tables) else 0
        for name, (required, query) in COUNT_QUERIES.items()
    }


def _read_only(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    connection.execute("PRAGMA query_only=ON")
    return connection


def _backup(path: Path) -> Path:
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    backup = path.with_name(f"{path.name}.pre-auth-{stamp}.bak")
    try:
        shutil.copy2(path, backup)
    except PermissionError:
        with _read_only(path) as source, sqlite3.connect(backup) as target:
            source.backup(target)
    return backup


def retire_anonymous_learning(database_path: Path, *, apply: bool) -> RetirementReport:
    path = _validate(database_path)
    with _read_only(path) as connection:
        before = _counts(connection)
    if not apply or not any(before.values()):
        return RetirementReport(path, False, before, dict(before), None)
    backup = _backup(path)
    connection = sqlite3.connect(path, timeout=10)
    try:
        connection.execute("PRAGMA busy_timeout=10000")
        connection.execute("BEGIN IMMEDIATE")
        tables = _tables(connection)
        for name, (required, _) in COUNT_QUERIES.items():
            if required.issubset(tables):
                connection.execute(DELETE_QUERIES[name], (ANONYMOUS_PATTERN,))
        after = _counts(connection)
        if any(after.values()):
            raise RuntimeError("anonymous learner rows remain after allowlisted cleanup")
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
    return RetirementReport(path, True, before, after, backup)


def main() -> int:
    parser = argparse.ArgumentParser(description="Retire legacy anon:* learning rows (dry-run by default).")
    parser.add_argument("--database", required=True, type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    report = retire_anonymous_learning(args.database, apply=args.apply)
    payload = asdict(report)
    payload["database_path"] = str(report.database_path)
    payload["backup_path"] = str(report.backup_path) if report.backup_path else None
    payload["total_matches"] = report.total_matches
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
