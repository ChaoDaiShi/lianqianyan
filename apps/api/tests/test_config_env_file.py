from pathlib import Path

from app.core.config import API_ENV_FILE


def test_backend_env_file_is_anchored_to_the_api_directory() -> None:
    expected = Path(__file__).resolve().parents[1] / ".env"

    assert API_ENV_FILE == expected
