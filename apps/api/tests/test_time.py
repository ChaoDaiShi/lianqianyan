from __future__ import annotations

from datetime import UTC, datetime
from importlib import import_module, util
import warnings


def test_utc_now_preserves_naive_utc_database_contract_without_warnings() -> None:
    spec = util.find_spec("app.core.time")
    assert spec is not None, "app.core.time must define the shared UTC clock"

    module = import_module("app.core.time")
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        value = module.utc_now()

    expected = datetime.now(UTC).replace(tzinfo=None)
    assert value.tzinfo is None
    assert abs((expected - value).total_seconds()) < 2
    assert not caught
