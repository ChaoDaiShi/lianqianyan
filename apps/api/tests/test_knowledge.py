from __future__ import annotations

from app.knowledge import KnowledgeDocument, KnowledgeRepository, LexicalKnowledgeRetriever
from app.knowledge.loader import CHUNK_MAX_CHARS, chunk_document, document_sections


def test_repository_loads_five_course_documents() -> None:
    documents = KnowledgeRepository().list_by_course("course-os")
    assert {item.knowledge_point_id for item in documents} == {
        "kp-process-concept",
        "kp-process-sync",
        "kp-pv",
        "kp-deadlock",
        "kp-scheduling",
    }


def test_retriever_routes_core_queries_to_expected_points() -> None:
    retriever = LexicalKnowledgeRetriever()
    assert retriever.retrieve("course-os", "死锁四个必要条件")[0].knowledge_point_id == "kp-deadlock"
    assert retriever.retrieve("course-os", "PV操作是什么")[0].knowledge_point_id == "kp-pv"
    assert retriever.retrieve("course-os", "进程调度")[0].knowledge_point_id == "kp-scheduling"


def test_retrieval_is_stable_and_course_isolated() -> None:
    retriever = LexicalKnowledgeRetriever()
    first = retriever.retrieve("course-os", "银行家算法", top_k=4)
    second = retriever.retrieve("course-os", "银行家算法", top_k=4)
    assert [item.chunk_id for item in first] == [item.chunk_id for item in second]
    assert retriever.retrieve("other-course", "死锁") == []


def test_knowledge_point_boost_handles_implicit_question() -> None:
    results = LexicalKnowledgeRetriever().retrieve(
        "course-os",
        "四个条件怎么记？",
        knowledge_point_id="kp-deadlock",
    )
    assert results
    assert results[0].knowledge_point_id == "kp-deadlock"


def test_documents_have_teaching_depth_and_render_sections() -> None:
    repository = KnowledgeRepository()
    documents = repository.list_by_course("course-os")

    assert all(800 <= len(item.content) <= 2_000 for item in documents)
    deadlock = repository.get_point_content("course-os", "kp-deadlock")
    assert deadlock is not None
    assert deadlock.title == "死锁"
    assert [section.title for section in deadlock.sections][:2] == [
        "定义与判断",
        "四个必要条件",
    ]
    assert repository.get_point_content("other-course", "kp-deadlock") is None


def test_chunking_is_heading_based_bounded_and_stable() -> None:
    long_content = "甲" * 450 + "。" + "乙" * 450 + "。" + "丙" * 450
    document = KnowledgeDocument(
        id="course-os:test",
        course_id="course-os",
        knowledge_point_id="kp-test",
        title="测试材料",
        content=f"# 第一节\n\n{long_content}\n\n# 第二节\n\n结论。",
    )

    first = chunk_document(document)
    second = chunk_document(document)

    assert [(item.id, item.content) for item in first] == [
        (item.id, item.content) for item in second
    ]
    assert [item.section for item in first][-1] == "第二节"
    assert all(0 < len(item.content) <= CHUNK_MAX_CHARS for item in first)
    assert [item.chunk_index for item in first] == list(range(len(first)))


def test_document_lookup_and_title_boost_are_deterministic() -> None:
    repository = KnowledgeRepository()
    scheduling = repository.get_document("course-os:scheduling")
    assert scheduling is not None
    assert scheduling.knowledge_point_id == "kp-scheduling"
    assert repository.get_document("missing") is None

    results = LexicalKnowledgeRetriever(repository).retrieve(
        "course-os", "调度目标", top_k=2
    )
    assert results[0].knowledge_point_id == "kp-scheduling"
    assert results[0].section == "调度目标与层次"


def test_document_sections_drop_headings_from_content() -> None:
    document = KnowledgeDocument(
        id="course-os:sections",
        course_id="course-os",
        knowledge_point_id="kp-sections",
        title="章节测试",
        content="# 概念\n\n第一段。\n\n## 例子\n\n第二段。",
    )

    sections = document_sections(document)

    assert [item.title for item in sections] == ["概念", "例子"]
    assert [item.content for item in sections] == ["第一段。", "第二段。"]
