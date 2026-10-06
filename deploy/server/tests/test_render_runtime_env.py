from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


MODULE_PATH = Path(__file__).resolve().parents[1] / "render_runtime_env.py"
SPEC = importlib.util.spec_from_file_location("render_runtime_env", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
runtime_env = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runtime_env)


def test_parse_env_uses_last_value_and_understands_quotes() -> None:
    values = runtime_env.parse_env_text(
        """
        # comment
        EDUCATION_LLM_API_KEY=first
        export EDUCATION_LLM_API_KEY=second
        EDUCATION_MINIMAX_API_KEY="mini max"
        EDUCATION_ANYSEARCH_API_KEY='search-key'
        """
    )

    assert values["EDUCATION_LLM_API_KEY"] == "second"
    assert values["EDUCATION_MINIMAX_API_KEY"] == "mini max"
    assert values["EDUCATION_ANYSEARCH_API_KEY"] == "search-key"


def test_build_runtime_values_filters_local_state_and_applies_production_boundary() -> None:
    source = runtime_env.parse_env_text(
        """
        EDUCATION_DATABASE_URL=sqlite:///local.db
        EDUCATION_JWT_SECRET=local-jwt
        EDUCATION_MODEL_SECRET_KEY=local-fernet
        EDUCATION_CORS_ORIGINS=http://127.0.0.1:5173
        EDUCATION_AUTH_COOKIE_SECURE=false
        EDUCATION_MCP_PUBLIC_BASE_URL=http://localhost/mcp
        EDUCATION_MCP_ALLOWED_HOSTS=localhost:*
        EDUCATION_CAPTCHA_MODE=off
        EDUCATION_LLM_BASE_URL=https://llm.example/v1
        EDUCATION_LLM_API_KEY=llm-secret
        EDUCATION_LLM_MODEL=teacher-model
        EDUCATION_MINIMAX_API_KEY=minimax-secret
        EDUCATION_ANYSEARCH_API_KEY=search-secret
        EDUCATION_UNKNOWN_SECRET=must-not-copy
        """
    )

    values = runtime_env.build_runtime_values(
        source,
        origin="https://8.156.67.132",
        public_prefix="/lianqianyan/",
        app_version="1.4.0+abcdef123456",
        jwt_secret="production-jwt",
        model_secret_key="production-fernet",
    )

    assert values["EDUCATION_DATABASE_URL"] == "sqlite:////data/education.db"
    assert values["EDUCATION_JWT_SECRET"] == "production-jwt"
    assert values["EDUCATION_MODEL_SECRET_KEY"] == "production-fernet"
    assert values["EDUCATION_CORS_ORIGINS"] == "https://8.156.67.132"
    assert values["EDUCATION_AUTH_COOKIE_SECURE"] == "true"
    assert values["EDUCATION_AUTH_REQUIRED"] == "true"
    assert values["EDUCATION_CAPTCHA_MODE"] == "auto"
    assert (
        values["EDUCATION_MCP_PUBLIC_BASE_URL"]
        == "https://8.156.67.132/lianqianyan/mcp"
    )
    assert values["EDUCATION_MCP_ALLOWED_HOSTS"] == "8.156.67.132"
    assert values["EDUCATION_APP_VERSION"] == "1.4.0+abcdef123456"
    assert values["EDUCATION_LLM_API_KEY"] == "llm-secret"
    assert values["EDUCATION_MINIMAX_API_KEY"] == "minimax-secret"
    assert values["EDUCATION_ANYSEARCH_API_KEY"] == "search-secret"
    assert "EDUCATION_UNKNOWN_SECRET" not in values
    assert "local-jwt" not in values.values()
    assert "local-fernet" not in values.values()


def test_generated_secrets_are_fresh_and_fernet_shaped() -> None:
    first = runtime_env.build_runtime_values(
        {},
        origin="https://8.156.67.132",
        public_prefix="/lianqianyan",
        app_version="1.4.0+one",
    )
    second = runtime_env.build_runtime_values(
        {},
        origin="https://8.156.67.132",
        public_prefix="/lianqianyan",
        app_version="1.4.0+two",
    )

    assert first["EDUCATION_JWT_SECRET"] != second["EDUCATION_JWT_SECRET"]
    assert first["EDUCATION_MODEL_SECRET_KEY"] != second[
        "EDUCATION_MODEL_SECRET_KEY"
    ]
    assert len(first["EDUCATION_MODEL_SECRET_KEY"]) == 44
    assert first["EDUCATION_MODEL_SECRET_KEY"].endswith("=")


@pytest.mark.parametrize(
    ("origin", "prefix"),
    [
        ("http://8.156.67.132", "/lianqianyan"),
        ("https://user@8.156.67.132", "/lianqianyan"),
        ("https://8.156.67.132/path", "/lianqianyan"),
        ("https://8.156.67.132", "//attacker.example"),
        ("https://8.156.67.132", "/../admin"),
    ],
)
def test_rejects_unsafe_origin_or_prefix(origin: str, prefix: str) -> None:
    with pytest.raises(ValueError):
        runtime_env.build_runtime_values(
            {},
            origin=origin,
            public_prefix=prefix,
            app_version="1.4.0+test",
        )


def test_write_env_file_is_atomic_private_and_does_not_log_values(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    output = tmp_path / "private" / "api.env"
    values = {
        "EDUCATION_LLM_API_KEY": 'secret with spaces and "quotes"',
        "EDUCATION_APP_NAME": "涟千言 API",
    }

    runtime_env.write_env_file(output, values)

    text = output.read_text(encoding="utf-8")
    assert (
        'EDUCATION_LLM_API_KEY="secret with spaces and \\"quotes\\""' in text
    )
    assert 'EDUCATION_APP_NAME="涟千言 API"' in text
    assert "secret with spaces" not in capsys.readouterr().out
    assert not list(output.parent.glob("*.tmp"))
