"""Global pytest safety boundary.

Several legacy suites intentionally rebuild the application's default engine. Point that
engine at a per-process temporary database before any ``app`` module is imported so test
collection can never mutate the ignored runtime ``education.db`` files.
"""

from __future__ import annotations

import gc
import os
import tempfile
import time
from pathlib import Path

import pytest


_TEST_DATABASE_PATH = (
    Path(tempfile.gettempdir()) / f"educationmind-pytest-{os.getpid()}.db"
).resolve()
os.environ["EDUCATION_DATABASE_URL"] = (
    f"sqlite:///{_TEST_DATABASE_PATH.as_posix()}"
)
# Domain suites exercise their own contracts without fabricating a logged-in user.
# Authentication tests opt back in explicitly.
os.environ["EDUCATION_AUTH_REQUIRED"] = "false"


@pytest.fixture(autouse=True)
def reset_settings_cache(monkeypatch: pytest.MonkeyPatch):
    """Isolate tests from deployment dotenv files and cached settings."""
    from app.core.config import Settings, get_settings

    monkeypatch.setitem(Settings.model_config, "env_file", None)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def pytest_sessionfinish() -> None:
    """Release SQLAlchemy handles, then remove the exact temporary test DB files."""
    expected_parent = Path(tempfile.gettempdir()).resolve()
    if _TEST_DATABASE_PATH.parent != expected_parent:
        raise RuntimeError("refusing to clean a pytest database outside the temp directory")

    # Legacy suites create sessions from the application-level SessionLocal helper and
    # some do not close those sessions explicitly. On Windows an open SQLite handle
    # prevents unlink, so close the global session registry and dispose its pool first.
    from sqlalchemy.orm import close_all_sessions

    from app.db.session import engine

    close_all_sessions()
    engine.dispose(close=True)
    gc.collect()

    for suffix in ("", "-journal", "-shm", "-wal"):
        candidate = _TEST_DATABASE_PATH.with_name(_TEST_DATABASE_PATH.name + suffix)
        for attempt in range(5):
            try:
                candidate.unlink(missing_ok=True)
                break
            except PermissionError:
                if attempt == 4:
                    raise
                gc.collect()
                time.sleep(0.05 * (attempt + 1))
