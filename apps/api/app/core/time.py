"""Application clock helpers that preserve the current naive-UTC DB contract."""

from __future__ import annotations

from datetime import UTC, datetime


def utc_now() -> datetime:
    """Return the current UTC instant without tzinfo for existing DateTime columns."""

    return datetime.now(UTC).replace(tzinfo=None)
