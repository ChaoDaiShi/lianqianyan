"""Global pytest safety boundary.

Several legacy suites intentionally rebuild the application's default engine. Point that
engine at a per-process temporary database before any ``app`` module is imported so test
collection can never mutate the ignored runtime ``education.db`` files.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path


_TEST_DATABASE_PATH = (
    Path(tempfile.gettempdir()) / f"educationmind-pytest-{os.getpid()}.db"
).resolve()
os.environ["EDUCATION_DATABASE_URL"] = (
    f"sqlite:///{_TEST_DATABASE_PATH.as_posix()}"
)


def pytest_sessionfinish() -> None:
    """Remove only the exact per-process database and SQLite sidecars."""
    expected_parent = Path(tempfile.gettempdir()).resolve()
    if _TEST_DATABASE_PATH.parent != expected_parent:
        raise RuntimeError("refusing to clean a pytest database outside the temp directory")
    for suffix in ("", "-journal", "-shm", "-wal"):
        _TEST_DATABASE_PATH.with_name(_TEST_DATABASE_PATH.name + suffix).unlink(
            missing_ok=True
        )

