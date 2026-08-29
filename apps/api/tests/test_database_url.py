from __future__ import annotations

from pathlib import Path

from sqlalchemy.engine import make_url

from app.core.config import API_ENV_FILE, Settings


def test_relative_sqlite_url_is_anchored_to_api_directory() -> None:
    settings = Settings(database_url="sqlite:///./education.db", _env_file=None)

    expected = (API_ENV_FILE.parent / "education.db").resolve()
    actual_database = make_url(settings.database_url).database

    assert actual_database is not None
    assert Path(actual_database).is_absolute()
    assert Path(actual_database).resolve() == expected


def test_explicit_absolute_and_memory_database_urls_are_preserved() -> None:
    absolute = (API_ENV_FILE.parent / "custom.db").resolve()

    assert (
        Settings(
            database_url=f"sqlite:///{absolute.as_posix()}",
            _env_file=None,
        ).database_url
        == f"sqlite:///{absolute.as_posix()}"
    )
    assert Settings(database_url="sqlite:///:memory:", _env_file=None).database_url == "sqlite:///:memory:"
