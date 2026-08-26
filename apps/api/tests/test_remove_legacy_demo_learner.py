from __future__ import annotations

import hashlib
import sqlite3
from pathlib import Path

import pytest

from scripts.remove_legacy_demo_learner import remove_legacy_demo_learner


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _database(path: Path) -> None:
    with sqlite3.connect(path) as connection:
        connection.executescript(
            """
            CREATE TABLE users (id TEXT PRIMARY KEY);
            CREATE TABLE learner_profiles (id TEXT PRIMARY KEY, user_id TEXT);
            CREATE TABLE mastery_records (id TEXT PRIMARY KEY, learner_id TEXT);
            CREATE TABLE learning_evidence (id TEXT PRIMARY KEY, learner_id TEXT);
            CREATE TABLE study_plans (id TEXT PRIMARY KEY, learner_id TEXT);
            CREATE TABLE study_tasks (id TEXT PRIMARY KEY, plan_id TEXT);
            CREATE TABLE exam_attempts (id TEXT PRIMARY KEY, learner_id TEXT);
            CREATE TABLE exam_answers (id TEXT PRIMARY KEY, attempt_id TEXT);

            INSERT INTO users VALUES ('demo-user-001'), ('anon:keep-me');
            INSERT INTO learner_profiles VALUES ('profile-demo', 'demo-user-001'), ('profile-keep', 'anon:keep-me');
            INSERT INTO mastery_records VALUES ('mastery-demo', 'demo-user-001'), ('mastery-keep', 'anon:keep-me');
            INSERT INTO learning_evidence VALUES ('evidence-demo', 'demo-user-001'), ('evidence-keep', 'anon:keep-me');
            INSERT INTO study_plans VALUES ('plan-demo', 'demo-user-001'), ('plan-keep', 'anon:keep-me');
            INSERT INTO study_tasks VALUES ('task-demo', 'plan-demo'), ('task-keep', 'plan-keep');
            INSERT INTO exam_attempts VALUES ('attempt-demo', 'demo-user-001'), ('attempt-keep', 'anon:keep-me');
            INSERT INTO exam_answers VALUES ('answer-demo', 'attempt-demo'), ('answer-keep', 'attempt-keep');
            """
        )


def _count(connection: sqlite3.Connection, table: str) -> int:
    return connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


def test_dry_run_does_not_write_database(tmp_path: Path) -> None:
    database_path = (tmp_path / "education.db").resolve()
    _database(database_path)
    before_hash = _sha256(database_path)
    before_mtime = database_path.stat().st_mtime_ns

    report = remove_legacy_demo_learner(database_path, apply=False)

    assert report.total_matches == 8
    assert report.backup_path is None
    assert _sha256(database_path) == before_hash
    assert database_path.stat().st_mtime_ns == before_mtime


def test_apply_backs_up_and_preserves_other_learners(tmp_path: Path) -> None:
    database_path = (tmp_path / "education.db").resolve()
    _database(database_path)
    before_hash = _sha256(database_path)

    report = remove_legacy_demo_learner(database_path, apply=True)

    assert report.total_matches == 8
    assert report.backup_path is not None
    assert report.backup_path.exists()
    assert _sha256(report.backup_path) == before_hash
    assert all(count == 0 for count in report.after_counts.values())

    with sqlite3.connect(database_path) as connection:
        assert _count(connection, "users") == 1
        assert _count(connection, "learner_profiles") == 1
        assert _count(connection, "mastery_records") == 1
        assert _count(connection, "learning_evidence") == 1
        assert _count(connection, "study_plans") == 1
        assert _count(connection, "study_tasks") == 1
        assert _count(connection, "exam_attempts") == 1
        assert _count(connection, "exam_answers") == 1


def test_rejects_relative_database_paths(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.chdir(tmp_path)
    database_path = Path("education.db")
    _database(database_path)

    with pytest.raises(ValueError, match="absolute"):
        remove_legacy_demo_learner(database_path, apply=False)
