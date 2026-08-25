from __future__ import annotations

import pytest

from app.knowledge import KnowledgeDocument, KnowledgeRepository
from app.resources import (
    KnowledgeResourceNotFound,
    ResourceGenerationRequest,
    ResourceGenerationService,
    ResourceType,
)


def repository() -> KnowledgeRepository:
    return KnowledgeRepository(
        [
            KnowledgeDocument(
                id="course-test:deadlock",
                course_id="course-test",
                knowledge_point_id="kp/deadlock",
                title="死锁入门",
                content=(
                    "# 定义与判断\n\n"
                    "死锁是多个进程互相等待资源而无法继续推进的状态。判断时要观察等待关系。\n\n"
                    "# 解决思路\n\n"
                    "可以从预防、避免、检测与解除四类思路分析。先识别资源分配关系。"
                ),
            )
        ]
    )


def generate(resource_type: ResourceType):
    request = ResourceGenerationRequest(
        course_id="course-test",
        knowledge_point_id="kp/deadlock",
        resource_type=resource_type,
    )
    return ResourceGenerationService(repository()).generate(request)


@pytest.mark.parametrize("resource_type", list(ResourceType))
def test_all_resource_types_are_deterministic_and_source_grounded(
    resource_type: ResourceType,
) -> None:
    first = generate(resource_type)
    second = generate(resource_type)

    assert first == second
    assert first.resource_type == resource_type
    assert first.format == "markdown"
    assert first.generation_mode == "course_template"
    assert first.source_sections == ["定义与判断", "解决思路"]
    assert first.filename == f"kp-deadlock-{resource_type.value}.md"
    assert "死锁入门" in first.title
    assert "定义与判断" in first.content
    assert "解决思路" in first.content
    assert "基于课程材料" in first.content


def test_study_sheet_uses_full_sections_and_checklist() -> None:
    result = generate(ResourceType.STUDY_SHEET)

    assert "死锁是多个进程互相等待资源" in result.content
    assert "可以从预防、避免、检测与解除" in result.content
    assert "- [ ] 我能解释「定义与判断」" in result.content


def test_flashcards_and_quiz_keep_answers_tied_to_source_sections() -> None:
    cards = generate(ResourceType.FLASHCARDS)
    quiz = generate(ResourceType.QUIZ)

    assert "**正面：** 定义与判断" in cards.content
    assert "**背面：** 死锁是多个进程互相等待资源" in cards.content
    assert "请用自己的话解释「解决思路」" in quiz.content
    assert "> 参考要点：可以从预防、避免、检测与解除" in quiz.content


def test_mind_map_and_study_plan_preserve_section_order() -> None:
    mind_map = generate(ResourceType.MIND_MAP)
    plan = generate(ResourceType.STUDY_PLAN)

    assert mind_map.content.index("定义与判断") < mind_map.content.index("解决思路")
    assert "  - 死锁是多个进程互相等待资源而无法继续推进的状态" in mind_map.content
    assert "1. [ ] 定义与判断（约 10 分钟）" in plan.content
    assert "2. [ ] 解决思路（约 10 分钟）" in plan.content


def test_missing_course_or_knowledge_point_never_generates_placeholder_content() -> None:
    service = ResourceGenerationService(repository())

    with pytest.raises(KnowledgeResourceNotFound):
        service.generate(
            ResourceGenerationRequest(
                course_id="other-course",
                knowledge_point_id="kp/deadlock",
                resource_type=ResourceType.STUDY_SHEET,
            )
        )

    with pytest.raises(KnowledgeResourceNotFound):
        service.generate(
            ResourceGenerationRequest(
                course_id="course-test",
                knowledge_point_id="missing",
                resource_type=ResourceType.STUDY_SHEET,
            )
        )
