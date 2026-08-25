"""考试领域公共入口。"""

from app.exams.grading import grade_answer, normalize_text, validate_question_content
from app.exams.models import (
    COMPATIBLE_GRADING,
    GradeOutcome,
    GradingStrategy,
    QuestionResponseKind,
    QuestionTypeCreate,
)

__all__ = [
    "COMPATIBLE_GRADING",
    "GradeOutcome",
    "GradingStrategy",
    "QuestionResponseKind",
    "QuestionTypeCreate",
    "grade_answer",
    "normalize_text",
    "validate_question_content",
]

