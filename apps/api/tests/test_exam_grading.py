from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.exams import (
    GradingStrategy,
    QuestionResponseKind,
    QuestionTypeCreate,
    grade_answer,
    validate_question_content,
)


def test_custom_question_type_accepts_safe_compatible_pair() -> None:
    question_type = QuestionTypeCreate(
        name="概念解释题",
        description="用自己的话解释概念",
        response_kind=QuestionResponseKind.LONG_TEXT,
        grading_strategy=GradingStrategy.MANUAL,
    )

    assert question_type.name == "概念解释题"
    assert question_type.description == "用自己的话解释概念"


@pytest.mark.parametrize(
    ("response_kind", "grading_strategy"),
    [
        (QuestionResponseKind.SINGLE_CHOICE, GradingStrategy.SET_EXACT),
        (QuestionResponseKind.MULTIPLE_CHOICE, GradingStrategy.EXACT),
        (QuestionResponseKind.BOOLEAN, GradingStrategy.KEYWORD),
        (QuestionResponseKind.LONG_TEXT, GradingStrategy.EXACT),
    ],
)
def test_custom_question_type_rejects_incompatible_grading(
    response_kind: QuestionResponseKind,
    grading_strategy: GradingStrategy,
) -> None:
    with pytest.raises(ValidationError):
        QuestionTypeCreate(
            name="不兼容题型",
            response_kind=response_kind,
            grading_strategy=grading_strategy,
        )


def test_choice_content_requires_unique_options_and_valid_answer() -> None:
    with pytest.raises(ValueError, match="options must contain 2 to 12 unique items"):
        validate_question_content(
            response_kind=QuestionResponseKind.SINGLE_CHOICE,
            grading_strategy=GradingStrategy.EXACT,
            options=["互斥", "互斥"],
            correct_answer="互斥",
            keywords=[],
        )

    with pytest.raises(ValueError, match="correct answer must be one of the options"):
        validate_question_content(
            response_kind=QuestionResponseKind.SINGLE_CHOICE,
            grading_strategy=GradingStrategy.EXACT,
            options=["互斥", "请求并保持"],
            correct_answer="循环等待",
            keywords=[],
        )


def test_multiple_choice_content_rejects_duplicate_or_unknown_answers() -> None:
    with pytest.raises(ValueError, match="multiple-choice answer"):
        validate_question_content(
            response_kind=QuestionResponseKind.MULTIPLE_CHOICE,
            grading_strategy=GradingStrategy.SET_EXACT,
            options=["互斥", "请求并保持", "循环等待"],
            correct_answer=["互斥", "互斥"],
            keywords=[],
        )

    with pytest.raises(ValueError, match="multiple-choice answer"):
        validate_question_content(
            response_kind=QuestionResponseKind.MULTIPLE_CHOICE,
            grading_strategy=GradingStrategy.SET_EXACT,
            options=["互斥", "请求并保持"],
            correct_answer=["互斥", "不可抢占"],
            keywords=[],
        )


def test_boolean_and_keyword_content_have_strict_shapes() -> None:
    with pytest.raises(ValueError, match="boolean answer"):
        validate_question_content(
            response_kind=QuestionResponseKind.BOOLEAN,
            grading_strategy=GradingStrategy.EXACT,
            options=[],
            correct_answer="true",
            keywords=[],
        )

    with pytest.raises(ValueError, match="keywords must contain"):
        validate_question_content(
            response_kind=QuestionResponseKind.SHORT_TEXT,
            grading_strategy=GradingStrategy.KEYWORD,
            options=[],
            correct_answer="",
            keywords=["互斥", " 互斥 "],
        )


def test_exact_text_grading_normalizes_whitespace_and_case() -> None:
    outcome = grade_answer(
        response_kind=QuestionResponseKind.SHORT_TEXT,
        grading_strategy=GradingStrategy.EXACT,
        submitted_answer="  Mutual   Exclusion ",
        correct_answer="mutual exclusion",
        keywords=[],
    )

    assert outcome.score_ratio == 1.0
    assert outcome.is_correct is True
    assert outcome.pending_manual is False


def test_multiple_choice_grading_is_order_independent_but_exact() -> None:
    correct = grade_answer(
        response_kind=QuestionResponseKind.MULTIPLE_CHOICE,
        grading_strategy=GradingStrategy.SET_EXACT,
        submitted_answer=["循环等待", "互斥"],
        correct_answer=["互斥", "循环等待"],
        keywords=[],
    )
    partial = grade_answer(
        response_kind=QuestionResponseKind.MULTIPLE_CHOICE,
        grading_strategy=GradingStrategy.SET_EXACT,
        submitted_answer=["互斥"],
        correct_answer=["互斥", "循环等待"],
        keywords=[],
    )

    assert (correct.score_ratio, correct.is_correct) == (1.0, True)
    assert (partial.score_ratio, partial.is_correct) == (0.0, False)


def test_boolean_grading_does_not_coerce_strings() -> None:
    correct = grade_answer(
        response_kind=QuestionResponseKind.BOOLEAN,
        grading_strategy=GradingStrategy.EXACT,
        submitted_answer=False,
        correct_answer=False,
        keywords=[],
    )
    wrong_shape = grade_answer(
        response_kind=QuestionResponseKind.BOOLEAN,
        grading_strategy=GradingStrategy.EXACT,
        submitted_answer="false",
        correct_answer=False,
        keywords=[],
    )

    assert correct.score_ratio == 1.0
    assert wrong_shape.score_ratio == 0.0


def test_keyword_grading_returns_transparent_partial_credit() -> None:
    outcome = grade_answer(
        response_kind=QuestionResponseKind.LONG_TEXT,
        grading_strategy=GradingStrategy.KEYWORD,
        submitted_answer="死锁需要互斥，并且可能出现循环等待。",
        correct_answer="",
        keywords=["互斥", "请求并保持", "循环等待"],
    )

    assert outcome.score_ratio == pytest.approx(2 / 3)
    assert outcome.is_correct is False
    assert outcome.matched_keywords == ["互斥", "循环等待"]
    assert outcome.missing_keywords == ["请求并保持"]


def test_manual_grading_stays_pending_without_inventing_a_score() -> None:
    outcome = grade_answer(
        response_kind=QuestionResponseKind.LONG_TEXT,
        grading_strategy=GradingStrategy.MANUAL,
        submitted_answer="我用资源分配图解释这个过程。",
        correct_answer="参考答案",
        keywords=[],
    )

    assert outcome.score_ratio is None
    assert outcome.is_correct is None
    assert outcome.pending_manual is True

