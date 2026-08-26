"""幂等写入考试系统内置题型。"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.exams.entities import ExamQuestionType
from app.exams.grading import normalize_text
from app.exams.models import GradingStrategy, QuestionResponseKind


BUILTIN_QUESTION_TYPES = (
    (
        "type-single-choice",
        "单选题",
        "从多个选项中选择一个答案",
        QuestionResponseKind.SINGLE_CHOICE,
        GradingStrategy.EXACT,
    ),
    (
        "type-multiple-choice",
        "多选题",
        "选择全部正确选项，集合完全匹配得分",
        QuestionResponseKind.MULTIPLE_CHOICE,
        GradingStrategy.SET_EXACT,
    ),
    (
        "type-boolean",
        "判断题",
        "判断陈述是否正确",
        QuestionResponseKind.BOOLEAN,
        GradingStrategy.EXACT,
    ),
    (
        "type-keyword-short",
        "关键词简答题",
        "按命中关键词比例自动评分",
        QuestionResponseKind.SHORT_TEXT,
        GradingStrategy.KEYWORD,
    ),
    (
        "type-manual-long",
        "人工论述题",
        "提交后进入人工批阅队列",
        QuestionResponseKind.LONG_TEXT,
        GradingStrategy.MANUAL,
    ),
    (
        "type-ai-semantic-short",
        "AI 语义简答题",
        "由昔涟教官按课程参考答案与评分关键词自动判卷",
        QuestionResponseKind.SHORT_TEXT,
        GradingStrategy.AI_SEMANTIC,
    ),
)


def seed_exam_data(db: Session) -> None:
    now = utc_now()
    for identifier, name, description, response_kind, grading_strategy in BUILTIN_QUESTION_TYPES:
        if db.get(ExamQuestionType, identifier) is not None:
            continue
        db.add(
            ExamQuestionType(
                id=identifier,
                name=name,
                name_key=normalize_text(name),
                description=description,
                response_kind=response_kind.value,
                grading_strategy=grading_strategy.value,
                is_builtin=True,
                is_archived=False,
                created_at=now,
                updated_at=now,
            )
        )
    db.commit()
