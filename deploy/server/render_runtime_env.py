#!/usr/bin/env python3
"""Render a private production dotenv file without copying local state."""

from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
import re
import secrets
import tempfile
from urllib.parse import urlsplit


ENVIRONMENT_KEY = re.compile(r"^[A-Z][A-Z0-9_]*$")
PUBLIC_PATH_SEGMENT = re.compile(r"^[A-Za-z0-9._~-]+$")
UNSAFE_PUBLIC_PATH_CHARACTER = re.compile(r"[?#\\\x00-\x1f\x7f]")

ALLOWED_SOURCE_KEYS = frozenset(
    {
        "EDUCATION_LLM_BASE_URL",
        "EDUCATION_LLM_API_KEY",
        "EDUCATION_LLM_MODEL",
        "EDUCATION_LLM_TIMEOUT",
        "EDUCATION_CUSTOM_MODEL_HOSTS",
        "EDUCATION_CUSTOM_MODEL_ALLOW_HTTP",
        "EDUCATION_TURNSTILE_SITE_KEY",
        "EDUCATION_TURNSTILE_SECRET_KEY",
        "EDUCATION_TURNSTILE_TIMEOUT",
        "EDUCATION_VAPTCHA_VID",
        "EDUCATION_VAPTCHA_KEY",
        "EDUCATION_MINIMAX_API_KEY",
        "EDUCATION_MINIMAX_GROUP_ID",
        "EDUCATION_MINIMAX_BASE_URL",
        "EDUCATION_MINIMAX_MODEL",
        "EDUCATION_MINIMAX_VOICE_ID",
        "EDUCATION_MINIMAX_TIMEOUT",
        "EDUCATION_MINIMAX_IMAGE_MODEL",
        "EDUCATION_ANYSEARCH_API_KEY",
        "EDUCATION_ANYSEARCH_BASE_URL",
        "EDUCATION_ANYSEARCH_TIMEOUT",
        "EDUCATION_AUTH_SESSION_DAYS",
    }
)


def _parse_value(raw_value: str) -> str:
    value = raw_value.strip()
    if len(value) >= 2 and value[0] == value[-1] == '"':
        try:
            decoded = json.loads(value)
        except json.JSONDecodeError as error:
            raise ValueError("invalid double-quoted dotenv value") from error
        if not isinstance(decoded, str):
            raise ValueError("dotenv value must decode to text")
        return decoded
    if len(value) >= 2 and value[0] == value[-1] == "'":
        return value[1:-1]
    return value


def parse_env_text(text: str) -> dict[str, str]:
    """Parse the small dotenv subset used by the deployment source file."""
    values: dict[str, str] = {}
    for raw_line in text.lstrip("\ufeff").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            raise ValueError("dotenv line must contain '='")
        key, raw_value = line.split("=", 1)
        key = key.strip()
        if not ENVIRONMENT_KEY.fullmatch(key):
            raise ValueError(f"invalid dotenv key: {key!r}")
        values[key] = _parse_value(raw_value)
    return values


def _normalize_origin(origin: str) -> tuple[str, str]:
    candidate = origin.strip().rstrip("/")
    parsed = urlsplit(candidate)
    if (
        parsed.scheme != "https"
        or not parsed.netloc
        or parsed.username
        or parsed.password
        or parsed.path
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("origin must be an absolute HTTPS origin without a path")
    return f"https://{parsed.netloc}", parsed.netloc


def _normalize_public_prefix(public_prefix: str) -> str:
    candidate = public_prefix.strip()
    if (
        not candidate.startswith("/")
        or candidate.startswith("//")
        or UNSAFE_PUBLIC_PATH_CHARACTER.search(candidate)
    ):
        raise ValueError("public prefix must be a safe same-origin path")
    segments = [segment for segment in candidate.split("/") if segment]
    if any(
        segment in {".", ".."} or not PUBLIC_PATH_SEGMENT.fullmatch(segment)
        for segment in segments
    ):
        raise ValueError("public prefix contains an unsafe segment")
    return "/" if not segments else f"/{'/'.join(segments)}/"


def _new_model_secret_key() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("ascii")


def build_runtime_values(
    source_values: dict[str, str],
    *,
    origin: str,
    public_prefix: str,
    app_version: str,
    jwt_secret: str | None = None,
    model_secret_key: str | None = None,
) -> dict[str, str]:
    """Filter provider settings and apply the fixed production boundary."""
    normalized_origin, allowed_host = _normalize_origin(origin)
    normalized_prefix = _normalize_public_prefix(public_prefix)
    normalized_version = app_version.strip()
    if not normalized_version:
        raise ValueError("app version is required")

    values = {
        key: value.strip()
        for key, value in source_values.items()
        if key in ALLOWED_SOURCE_KEYS and value.strip()
    }
    public_root = (
        normalized_origin
        if normalized_prefix == "/"
        else f"{normalized_origin}{normalized_prefix.rstrip('/')}"
    )
    values.update(
        {
            "EDUCATION_APP_NAME": "lianqianyan-api",
            "EDUCATION_APP_VERSION": normalized_version,
            "EDUCATION_DATABASE_URL": "sqlite:////data/education.db",
            "EDUCATION_CORS_ORIGINS": normalized_origin,
            "EDUCATION_AUTH_REQUIRED": "true",
            "EDUCATION_AUTH_COOKIE_SECURE": "true",
            "EDUCATION_CAPTCHA_MODE": "auto",
            "EDUCATION_MCP_PUBLIC_BASE_URL": f"{public_root}/mcp",
            "EDUCATION_MCP_ALLOWED_HOSTS": allowed_host,
            "EDUCATION_JWT_SECRET": (
                jwt_secret.strip() if jwt_secret else secrets.token_urlsafe(48)
            ),
            "EDUCATION_MODEL_SECRET_KEY": (
                model_secret_key.strip()
                if model_secret_key
                else _new_model_secret_key()
            ),
        }
    )
    return values


def write_env_file(output: Path, values: dict[str, str]) -> None:
    """Atomically write a dotenv file without exposing values on stdout."""
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"{key}={json.dumps(value, ensure_ascii=False)}"
        for key, value in sorted(values.items())
    ]
    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="\n",
            prefix=f".{output.name}.",
            suffix=".tmp",
            dir=output.parent,
            delete=False,
        ) as temporary:
            temporary.write("\n".join(lines) + "\n")
            temporary.flush()
            os.fsync(temporary.fileno())
            temporary_name = temporary.name
        os.replace(temporary_name, output)
        temporary_name = None
        if os.name != "nt":
            output.chmod(0o600)
    finally:
        if temporary_name is not None:
            Path(temporary_name).unlink(missing_ok=True)


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render a filtered, private 涟千言 production environment file."
    )
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--origin", required=True)
    parser.add_argument("--public-prefix", required=True)
    parser.add_argument("--app-version", default="1.4.0")
    return parser.parse_args()


def main() -> int:
    args = _arguments()
    source = args.source.resolve()
    if not source.is_file():
        raise SystemExit(f"source dotenv file does not exist: {source}")
    values = build_runtime_values(
        parse_env_text(source.read_text(encoding="utf-8-sig")),
        origin=args.origin,
        public_prefix=args.public_prefix,
        app_version=args.app_version,
    )
    write_env_file(args.output, values)
    print(f"Wrote {len(values)} environment keys to {args.output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
