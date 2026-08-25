from __future__ import annotations

from pathlib import Path

from app.core.config import get_settings


def test_pytest_default_database_is_an_explicit_temporary_database() -> None:
    database_url = get_settings().database_url

    assert "educationmind-pytest-" in database_url
    assert Path("education.db").resolve().as_posix() not in database_url

