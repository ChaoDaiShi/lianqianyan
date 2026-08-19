from __future__ import annotations

import pytest

from app.agents.base import AgentCapability
from app.agents.router import AgentRouter


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        ("我哪里薄弱", AgentCapability.DIAGNOSIS),
        ("今天学什么", AgentCapability.PLANNING),
        ("为什么这题错了", AgentCapability.ASSESSMENT),
        ("解释死锁", AgentCapability.TUTORING),
        ("随便聊聊", AgentCapability.TUTORING),
    ],
)
def test_router_is_deterministic(message: str, expected: AgentCapability) -> None:
    decision = AgentRouter().route(message, None)
    assert decision.capability == expected


def test_explicit_capability_wins() -> None:
    decision = AgentRouter().route("解释死锁", AgentCapability.DIAGNOSIS)
    assert decision.capability == AgentCapability.DIAGNOSIS
    assert decision.collaborative is False


def test_priority_question_selects_collaboration() -> None:
    decision = AgentRouter().route("我现在最应该学什么，为什么？", None)
    assert decision.capability == AgentCapability.PLANNING
    assert decision.collaborative is True
