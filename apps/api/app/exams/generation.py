from __future__ import annotations

import json
import re
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.exams.models import ExamCreate, ExamItemCreate, ExamOut, QuestionCreate
from app.exams.service import ExamService
from app.knowledge import KnowledgePointContent, KnowledgeRepository
from app.llm import BaseLLMProvider, LLMMessage, get_llm_provider


GenerationPurpose = Literal["exam", "practice"]
GenerationMode = Literal["llm", "course_grounded"]


class ExamGenerationRequest(BaseModel):
    course_id: str = Field(min_length=1, max_length=80)
    knowledge_point_ids: list[str] = Field(min_length=1, max_length=5)
    purpose: GenerationPurpose = "exam"
    title: str = Field(min_length=1, max_length=160)
    question_count: int = Field(default=8, ge=3, le=30)
    difficulty: float = Field(default=0.5, ge=0.0, le=1.0)
    duration_minutes: int = Field(default=30, ge=1, le=480)
    publish_immediately: bool = False
    include_ai_review_question: bool = True

    @field_validator("course_id", "title")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("knowledge_point_ids")
    @classmethod
    def normalize_points(cls, values: list[str]) -> list[str]:
        normalized = [value.strip() for value in values if value.strip()]
        if not normalized or len(set(normalized)) != len(normalized):
            raise ValueError("knowledge point ids must be unique and non-empty")
        return normalized


class ExamGenerationResult(BaseModel):
    exam: ExamOut
    generation_mode: GenerationMode
    provider: str | None = None
    model: str | None = None
    source_sections: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class GenerationSourceNotFound(LookupError):
    pass


class _GeneratedQuestion(BaseModel):
    kind: Literal["single_choice", "boolean", "short_text", "ai_short"]
    knowledge_point_id: str
    prompt: str = Field(min_length=1, max_length=4_000)
    options: list[str] = Field(default_factory=list, max_length=12)
    correct_answer: Any
    keywords: list[str] = Field(default_factory=list, max_length=12)
    explanation: str = Field(min_length=1, max_length=4_000)
    points: float = Field(default=10.0, gt=0.0, le=1_000.0)


_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


class ExamGenerationService:
    def __init__(
        self,
        db: Session,
        *,
        repository: KnowledgeRepository | None = None,
        llm_provider: BaseLLMProvider | None = None,
    ) -> None:
        self._exam = ExamService(db)
        self._knowledge = repository or KnowledgeRepository()
        self._llm = llm_provider or get_llm_provider()

    async def generate(self, request: ExamGenerationRequest) -> ExamGenerationResult:
        points = self._load_points(request)
        source_sections = list(
            dict.fromkeys(
                f"{point.title} · {section.title}"
                for point in points
                for section in point.sections
            )
        )
        warnings: list[str] = []
        provider: str | None = None
        model: str | None = None
        mode: GenerationMode = "course_grounded"

        try:
            drafts, provider, model = await self._generate_with_llm(request, points)
            mode = "llm"
        except Exception:
            drafts = self._generate_grounded(request, points)
            warnings.append("外部模型未配置或输出无效，已使用课程材料规则生成。")

        if request.include_ai_review_question and drafts:
            last = drafts[-1]
            drafts[-1] = last.model_copy(
                update={
                    "kind": "ai_short",
                    "options": [],
                    "keywords": last.keywords or [last.prompt[:40]],
                }
            )

        created = [self._exam.create_question(self._to_question(request, draft)) for draft in drafts]
        exam = self._exam.create_exam(
            ExamCreate(
                course_id=request.course_id,
                title=request.title,
                description=(
                    "昔涟教官生成的专项练习；作答与成绩进入正式学习证据。"
                    if request.purpose == "practice"
                    else "昔涟教官生成的试卷草稿；发布前请核对题目、答案与分值。"
                ),
                duration_minutes=request.duration_minutes,
                pass_percentage=60.0,
                shuffle_questions=request.purpose == "practice",
                items=[
                    ExamItemCreate(
                        question_id=question.id,
                        points=question.default_score,
                        position=index,
                    )
                    for index, question in enumerate(created, start=1)
                ],
            )
        )
        if request.publish_immediately or request.purpose == "practice":
            exam = self._exam.publish_exam(exam.id)
        return ExamGenerationResult(
            exam=exam,
            generation_mode=mode,
            provider=provider,
            model=model,
            source_sections=source_sections,
            warnings=warnings,
        )

    def _load_points(self, request: ExamGenerationRequest) -> list[KnowledgePointContent]:
        points: list[KnowledgePointContent] = []
        for point_id in request.knowledge_point_ids:
            point = self._knowledge.get_point_content(request.course_id, point_id)
            if point is None or not point.sections:
                raise GenerationSourceNotFound(f"knowledge point not found: {point_id}")
            points.append(point)
        return points

    async def _generate_with_llm(
        self,
        request: ExamGenerationRequest,
        points: list[KnowledgePointContent],
    ) -> tuple[list[_GeneratedQuestion], str, str | None]:
        material = "\n\n".join(
            f"KNOWLEDGE_POINT {point.knowledge_point_id} {point.title}\n"
            + "\n".join(f"[{section.title}] {section.content}" for section in point.sections)
            for point in points
        )
        result = await self._llm.chat(
            [
                LLMMessage(
                    role="system",
                    content=(
                        "你是昔涟 AI 教官的命题引擎。只能使用提供的课程材料。"
                        "只输出 JSON 数组，不要 Markdown。每项字段为 kind、knowledge_point_id、"
                        "prompt、options、correct_answer、keywords、explanation、points。"
                        "kind 只能是 single_choice、boolean、short_text。"
                    ),
                ),
                LLMMessage(
                    role="user",
                    content=(
                        f"生成 {request.question_count} 题，难度 {request.difficulty}。\n"
                        f"{material}"
                    ),
                ),
            ]
        )
        raw = _FENCE.sub("", result.content.strip())
        payload = json.loads(raw)
        if not isinstance(payload, list) or len(payload) != request.question_count:
            raise ValueError("llm question count mismatch")
        drafts = [_GeneratedQuestion.model_validate(item) for item in payload]
        allowed_points = set(request.knowledge_point_ids)
        if any(item.knowledge_point_id not in allowed_points for item in drafts):
            raise ValueError("llm returned an unknown knowledge point")
        return (
            drafts,
            str(result.usage.get("provider", self._llm.name)),
            str(result.usage.get("model")) if result.usage.get("model") else None,
        )

    @staticmethod
    def _generate_grounded(
        request: ExamGenerationRequest,
        points: list[KnowledgePointContent],
    ) -> list[_GeneratedQuestion]:
        section_rows = [
            (point.knowledge_point_id, point.title, section.title, " ".join(section.content.split()))
            for point in points
            for section in point.sections
        ]
        section_titles = list(dict.fromkeys(row[2] for row in section_rows))
        drafts: list[_GeneratedQuestion] = []
        for index in range(request.question_count):
            point_id, point_title, section_title, content = section_rows[index % len(section_rows)]
            kind_index = index % 3
            excerpt = content[:260].rstrip() + ("…" if len(content) > 260 else "")
            if kind_index == 0:
                distractors = [title for title in section_titles if title != section_title][:3]
                while len(distractors) < 3:
                    candidate = f"与{point_title}无关的选项 {len(distractors) + 1}"
                    distractors.append(candidate)
                options = [section_title, *distractors]
                drafts.append(
                    _GeneratedQuestion(
                        kind="single_choice",
                        knowledge_point_id=point_id,
                        prompt=f"根据课程材料，哪一项对应「{section_title}」这一内容？",
                        options=options,
                        correct_answer=section_title,
                        explanation=f"课程材料在「{section_title}」章节说明：{excerpt}",
                        points=10,
                    )
                )
            elif kind_index == 1:
                drafts.append(
                    _GeneratedQuestion(
                        kind="boolean",
                        knowledge_point_id=point_id,
                        prompt=f"判断：课程材料将「{section_title}」列为「{point_title}」的学习内容。",
                        correct_answer=True,
                        explanation=f"该判断来自「{section_title}」章节：{excerpt}",
                        points=10,
                    )
                )
            else:
                drafts.append(
                    _GeneratedQuestion(
                        kind="short_text",
                        knowledge_point_id=point_id,
                        prompt=f"请用自己的话说明「{section_title}」的核心含义。",
                        correct_answer=excerpt,
                        keywords=[section_title],
                        explanation=f"参考课程材料：{excerpt}",
                        points=10,
                    )
                )
        return drafts

    @staticmethod
    def _to_question(
        request: ExamGenerationRequest,
        draft: _GeneratedQuestion,
    ) -> QuestionCreate:
        type_ids = {
            "single_choice": "type-single-choice",
            "boolean": "type-boolean",
            "short_text": "type-keyword-short",
            "ai_short": "type-ai-semantic-short",
        }
        return QuestionCreate(
            course_id=request.course_id,
            knowledge_point_id=draft.knowledge_point_id,
            question_type_id=type_ids[draft.kind],
            prompt=draft.prompt,
            options=draft.options,
            correct_answer=draft.correct_answer,
            keywords=draft.keywords,
            explanation=draft.explanation,
            difficulty=request.difficulty,
            default_score=draft.points,
        )
