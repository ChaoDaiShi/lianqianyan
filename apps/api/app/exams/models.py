"""考试系统的稳定领域契约。

题型允许自定义名称与说明，但作答形态、评分策略必须来自安全白名单。
用户内容只作为数据保存和比较，绝不作为代码、正则或表达式执行。
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator


class QuestionResponseKind(str, Enum):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    BOOLEAN = "boolean"
    SHORT_TEXT = "short_text"
    LONG_TEXT = "long_text"


class GradingStrategy(str, Enum):
    EXACT = "exact"
    SET_EXACT = "set_exact"
    KEYWORD = "keyword"
    MANUAL = "manual"


COMPATIBLE_GRADING: dict[QuestionResponseKind, frozenset[GradingStrategy]] = {
    QuestionResponseKind.SINGLE_CHOICE: frozenset({GradingStrategy.EXACT}),
    QuestionResponseKind.MULTIPLE_CHOICE: frozenset({GradingStrategy.SET_EXACT}),
    QuestionResponseKind.BOOLEAN: frozenset({GradingStrategy.EXACT}),
    QuestionResponseKind.SHORT_TEXT: frozenset(
        {GradingStrategy.EXACT, GradingStrategy.KEYWORD, GradingStrategy.MANUAL}
    ),
    QuestionResponseKind.LONG_TEXT: frozenset(
        {GradingStrategy.KEYWORD, GradingStrategy.MANUAL}
    ),
}


class QuestionTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    description: str = Field(default="", max_length=500)
    response_kind: QuestionResponseKind
    grading_strategy: GradingStrategy

    @field_validator("name", "description")
    @classmethod
    def _strip_text(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def _validate_compatibility(self) -> "QuestionTypeCreate":
        allowed = COMPATIBLE_GRADING[self.response_kind]
        if self.grading_strategy not in allowed:
            raise ValueError(
                f"grading strategy {self.grading_strategy.value} is not compatible "
                f"with {self.response_kind.value}"
            )
        return self


class GradeOutcome(BaseModel):
    score_ratio: float | None = Field(default=None, ge=0.0, le=1.0)
    is_correct: bool | None = None
    pending_manual: bool = False
    matched_keywords: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)

