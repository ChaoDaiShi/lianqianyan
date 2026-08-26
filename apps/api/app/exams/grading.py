"""纯函数考试评分策略。"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

from app.exams.models import (
    COMPATIBLE_GRADING,
    GradeOutcome,
    GradingStrategy,
    QuestionResponseKind,
)


def normalize_text(value: str) -> str:
    """为确定性文本比较做温和归一化，不使用用户提供的正则。"""
    normalized = unicodedata.normalize("NFKC", value)
    return re.sub(r"\s+", " ", normalized).strip().casefold()


def _normalized_strings(values: list[Any]) -> list[str]:
    if not all(isinstance(item, str) for item in values):
        return []
    return [normalize_text(item) for item in values]


def validate_question_content(
    *,
    response_kind: QuestionResponseKind,
    grading_strategy: GradingStrategy,
    options: list[Any] | None,
    correct_answer: Any,
    keywords: list[Any] | None,
) -> None:
    """校验题目内容是否与题型结构一致。

    本函数抛出稳定、可面向 API 映射的 ``ValueError``，且不会修改输入。
    """
    if grading_strategy not in COMPATIBLE_GRADING[response_kind]:
        raise ValueError("grading strategy is incompatible with response kind")

    raw_options = options or []
    raw_keywords = keywords or []

    if response_kind in {
        QuestionResponseKind.SINGLE_CHOICE,
        QuestionResponseKind.MULTIPLE_CHOICE,
    }:
        normalized_options = _normalized_strings(raw_options)
        if (
            not 2 <= len(raw_options) <= 12
            or len(normalized_options) != len(raw_options)
            or any(not item for item in normalized_options)
            or len(set(normalized_options)) != len(normalized_options)
        ):
            raise ValueError("options must contain 2 to 12 unique items")
    elif raw_options:
        raise ValueError("options are only allowed for choice questions")

    if response_kind is QuestionResponseKind.SINGLE_CHOICE:
        if not isinstance(correct_answer, str) or normalize_text(correct_answer) not in set(
            _normalized_strings(raw_options)
        ):
            raise ValueError("correct answer must be one of the options")

    if response_kind is QuestionResponseKind.MULTIPLE_CHOICE:
        if not isinstance(correct_answer, list):
            raise ValueError("multiple-choice answer must be a unique non-empty option list")
        normalized_answer = _normalized_strings(correct_answer)
        option_set = set(_normalized_strings(raw_options))
        if (
            not normalized_answer
            or len(normalized_answer) != len(correct_answer)
            or any(not item for item in normalized_answer)
            or len(set(normalized_answer)) != len(normalized_answer)
            or not set(normalized_answer).issubset(option_set)
        ):
            raise ValueError("multiple-choice answer must be a unique non-empty option list")

    if response_kind is QuestionResponseKind.BOOLEAN and not isinstance(
        correct_answer, bool
    ):
        raise ValueError("boolean answer must be true or false")

    if grading_strategy is GradingStrategy.EXACT and response_kind in {
        QuestionResponseKind.SHORT_TEXT,
    }:
        if not isinstance(correct_answer, str) or not normalize_text(correct_answer):
            raise ValueError("exact text answer must not be blank")

    if grading_strategy in {GradingStrategy.KEYWORD, GradingStrategy.AI_SEMANTIC}:
        normalized_keywords = _normalized_strings(raw_keywords)
        if (
            not 1 <= len(raw_keywords) <= 12
            or len(normalized_keywords) != len(raw_keywords)
            or any(not item for item in normalized_keywords)
            or len(set(normalized_keywords)) != len(normalized_keywords)
        ):
            raise ValueError("keywords must contain 1 to 12 unique non-empty items")
    elif raw_keywords:
        raise ValueError("keywords are only allowed for keyword grading")


def grade_answer(
    *,
    response_kind: QuestionResponseKind,
    grading_strategy: GradingStrategy,
    submitted_answer: Any,
    correct_answer: Any,
    keywords: list[str] | None,
) -> GradeOutcome:
    """对一次作答给出 0..1 的确定性评分，人工题返回待批状态。"""
    if grading_strategy is GradingStrategy.MANUAL:
        return GradeOutcome(pending_manual=True)

    if grading_strategy is GradingStrategy.AI_SEMANTIC:
        return GradeOutcome(pending_ai=True)

    if grading_strategy is GradingStrategy.KEYWORD:
        normalized_submission = (
            normalize_text(submitted_answer) if isinstance(submitted_answer, str) else ""
        )
        ordered_keywords = [keyword.strip() for keyword in (keywords or [])]
        matched = [
            keyword
            for keyword in ordered_keywords
            if normalize_text(keyword) in normalized_submission
        ]
        missing = [keyword for keyword in ordered_keywords if keyword not in matched]
        ratio = len(matched) / len(ordered_keywords) if ordered_keywords else 0.0
        return GradeOutcome(
            score_ratio=ratio,
            is_correct=ratio == 1.0,
            matched_keywords=matched,
            missing_keywords=missing,
        )

    if grading_strategy is GradingStrategy.SET_EXACT:
        submitted = _normalized_strings(submitted_answer) if isinstance(submitted_answer, list) else []
        expected = _normalized_strings(correct_answer) if isinstance(correct_answer, list) else []
        valid_submission = (
            bool(submitted)
            and len(submitted) == len(submitted_answer)
            and len(set(submitted)) == len(submitted)
        )
        correct = valid_submission and set(submitted) == set(expected)
        return GradeOutcome(score_ratio=1.0 if correct else 0.0, is_correct=correct)

    if response_kind is QuestionResponseKind.BOOLEAN:
        correct = (
            isinstance(submitted_answer, bool)
            and isinstance(correct_answer, bool)
            and submitted_answer is correct_answer
        )
        return GradeOutcome(score_ratio=1.0 if correct else 0.0, is_correct=correct)

    if not isinstance(submitted_answer, str) or not isinstance(correct_answer, str):
        return GradeOutcome(score_ratio=0.0, is_correct=False)
    correct = normalize_text(submitted_answer) == normalize_text(correct_answer)
    return GradeOutcome(score_ratio=1.0 if correct else 0.0, is_correct=correct)
