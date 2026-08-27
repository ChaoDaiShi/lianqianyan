from __future__ import annotations

import hashlib
import sqlite3
from pathlib import Path

from scripts.retire_anonymous_learning import retire_anonymous_learning


def _hash(path: Path) -> str:
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
            CREATE TABLE courses (id TEXT PRIMARY KEY);
            INSERT INTO users VALUES ('anon:old'), ('account-1');
            INSERT INTO learner_profiles VALUES ('pa', 'anon:old'), ('pk', 'account-1');
            INSERT INTO mastery_records VALUES ('ma', 'anon:old'), ('mk', 'account-1');
            INSERT INTO learning_evidence VALUES ('ea', 'anon:old'), ('ek', 'account-1');
            INSERT INTO study_plans VALUES ('pla', 'anon:old'), ('plk', 'account-1');
            INSERT INTO study_tasks VALUES ('ta', 'pla'), ('tk', 'plk');
            INSERT INTO exam_attempts VALUES ('aa', 'anon:old'), ('ak', 'account-1');
            INSERT INTO exam_answers VALUES ('ana', 'aa'), ('ank', 'ak');
            INSERT INTO courses VALUES ('course-os');
            """
        )


def test_dry_run_is_read_only(tmp_path: Path) -> None:
    path = (tmp_path / 'education.db').resolve()
    _database(path)
    before = _hash(path)
    report = retire_anonymous_learning(path, apply=False)
    assert report.total_matches == 8
    assert report.backup_path is None
    assert _hash(path) == before


def test_apply_backs_up_removes_only_anonymous_learning_and_preserves_catalog(tmp_path: Path) -> None:
    path = (tmp_path / 'education.db').resolve()
    _database(path)
    before = _hash(path)
    report = retire_anonymous_learning(path, apply=True)
    assert report.applied
    assert report.backup_path is not None and report.backup_path.exists()
    assert _hash(report.backup_path) == before
    assert all(value == 0 for value in report.after_counts.values())
    with sqlite3.connect(path) as connection:
        for table in ('users', 'learner_profiles', 'mastery_records', 'learning_evidence', 'study_plans', 'study_tasks', 'exam_attempts', 'exam_answers', 'courses'):
            assert connection.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0] == 1
