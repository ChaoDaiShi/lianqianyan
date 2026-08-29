from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional


# ----------------------------------------------------------------------
# Paths
# ----------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "assets" / "template.json"


# ----------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------

def load_config() -> Dict[str, Any]:
    """Load routing configuration for Lian Navigator."""
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"Lian Navigator config not found: {CONFIG_PATH}"
        )

    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------

def _clean_text(value: Any) -> Optional[str]:
    if value is None:
        return None

    value = str(value).strip()
    return value or None


def _clamp_confidence(value: Any) -> Optional[float]:
    """
    Confidence is optional and is only used internally.
    It must never be displayed directly to the user.
    """
    if value is None:
        return None

    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    return max(0.0, min(1.0, number))


def _routing_table(config: Dict[str, Any]) -> Dict[str, Any]:
    routing = config.get("routing", {})
    return routing if isinstance(routing, dict) else {}


# ----------------------------------------------------------------------
# Route validation
# ----------------------------------------------------------------------

def validate_route(
    route: Optional[str],
    config: Dict[str, Any],
) -> Optional[str]:
    """
    Validate a route inferred by the model.

    The script does NOT infer intent itself.
    It only verifies whether the inferred route exists.
    """
    route = _clean_text(route)

    if not route:
        return None

    routing = _routing_table(config)

    if route not in routing:
        return None

    return route


def resolve_target_skill(
    route: Optional[str],
    config: Dict[str, Any],
) -> Optional[str]:
    """Resolve a valid route into its preferred downstream Skill."""
    if not route:
        return None

    routing = _routing_table(config)
    route_config = routing.get(route, {})

    if not isinstance(route_config, dict):
        return None

    return _clean_text(route_config.get("preferred_target"))


# ----------------------------------------------------------------------
# Exit decision
# ----------------------------------------------------------------------

def should_exit_navigator(
    *,
    goal_clear: bool = False,
    next_action_clear: bool = False,
    enough_information: bool = False,
    professional_task_identified: bool = False,
    direct_execution_instruction: bool = False,
) -> bool:
    """
    Lian Navigator should stop as soon as navigation is no longer needed.
    """
    return any(
        [
            goal_clear,
            next_action_clear,
            enough_information,
            professional_task_identified,
            direct_execution_instruction,
        ]
    )


# ----------------------------------------------------------------------
# Clarification control
# ----------------------------------------------------------------------

def normalize_question(
    question: Any,
    *,
    should_exit: bool,
) -> Optional[str]:
    """
    Keep at most one useful clarification question.

    Once navigation should exit, no additional clarification should be asked.
    """
    if should_exit:
        return None

    return _clean_text(question)


# ----------------------------------------------------------------------
# Main normalization
# ----------------------------------------------------------------------

def normalize_navigation_result(
    data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Normalize a navigation decision produced by the model.

    Expected model-side fields may include:

    {
        "route": "project",
        "goal": "...",
        "next_action": "...",
        "question": "...",
        "confidence": 0.9,
        "goal_clear": true,
        "next_action_clear": true,
        "enough_information": false,
        "professional_task_identified": false,
        "direct_execution_instruction": false
    }

    The returned structure is intended for internal workflow use.
    """
    config = load_config()

    route = validate_route(data.get("route"), config)
    confidence = _clamp_confidence(data.get("confidence"))

    goal_clear = bool(data.get("goal_clear", False))
    next_action_clear = bool(data.get("next_action_clear", False))
    enough_information = bool(data.get("enough_information", False))
    professional_task_identified = bool(
        data.get("professional_task_identified", False)
    )
    direct_execution_instruction = bool(
        data.get("direct_execution_instruction", False)
    )

    exit_navigator = should_exit_navigator(
        goal_clear=goal_clear,
        next_action_clear=next_action_clear,
        enough_information=enough_information,
        professional_task_identified=professional_task_identified,
        direct_execution_instruction=direct_execution_instruction,
    )

    target_skill = resolve_target_skill(route, config)

    question = normalize_question(
        data.get("question"),
        should_exit=exit_navigator,
    )

    result = {
        "route": route,
        "goal": _clean_text(data.get("goal")),
        "next_action": _clean_text(data.get("next_action")),
        "question": question,
        "target_skill": target_skill,
        "should_exit": exit_navigator,
    }

    # Confidence is intentionally internal-only.
    if confidence is not None:
        result["_confidence"] = confidence

    return result


# ----------------------------------------------------------------------
# Public entry
# ----------------------------------------------------------------------

def main(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generic entry point.

    This script intentionally does not classify the user's natural language.
    The language model should first understand the request, then pass its
    structured judgment here for validation and normalization.
    """
    if not isinstance(args, dict):
        return {
            "ok": False,
            "error": "args must be a dictionary",
        }

    try:
        result = normalize_navigation_result(args)

        return {
            "ok": True,
            "result": result,
        }

    except FileNotFoundError as exc:
        return {
            "ok": False,
            "error": str(exc),
        }

    except json.JSONDecodeError as exc:
        return {
            "ok": False,
            "error": f"Invalid template.json: {exc}",
        }

    except Exception as exc:
        return {
            "ok": False,
            "error": f"Unexpected navigation error: {exc}",
        }


# ----------------------------------------------------------------------
# Local test
# ----------------------------------------------------------------------

if __name__ == "__main__":
    sample = {
        "route": "project",
        "goal": "准备参加人工智能创新比赛",
        "next_action": "先阅读赛题并确定值得做的方向",
        "question": None,
        "confidence": 0.93,
        "goal_clear": True,
        "next_action_clear": True,
        "enough_information": True,
        "professional_task_identified": False,
        "direct_execution_instruction": False,
    }

    print(
        json.dumps(
            main(sample),
            ensure_ascii=False,
            indent=2,
        )
    )