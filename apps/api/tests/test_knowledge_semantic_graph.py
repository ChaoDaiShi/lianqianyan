from app.knowledge import KnowledgeDocument, KnowledgeRepository
from app.knowledge.context_builder import KnowledgeContextBuilder
from app.knowledge.graph import KnowledgeGraphGenerator
from app.knowledge.graphrag import GraphRAGRetriever


def test_prerequisites_are_explicit_and_independent_of_document_order():
    basic = KnowledgeDocument(
        id="course-test:z-basic", course_id="course-test", knowledge_point_id="kp-basic",
        title="基础", content="## 定义\n基础对象。\n## 例子\n操作示例。",
    )
    advanced = KnowledgeDocument(
        id="course-test:a-advanced", course_id="course-test", knowledge_point_id="kp-advanced",
        title="进阶", content="## 推导\n进阶操作。", prerequisite_ids=["kp-basic"],
    )
    for documents in ([advanced, basic], [basic, advanced]):
        graph = KnowledgeGraphGenerator(KnowledgeRepository(documents)).generate("course-test")
        assert {(edge.source, edge.target) for edge in graph.edges if edge.relation == "precedes"} == {
            ("point:kp-basic", "point:kp-advanced"),
        }


def test_graph_expansion_does_not_displace_relevant_passages_with_unrelated_neighbour():
    documents = [
        KnowledgeDocument(
            id="course-test:array", course_id="course-test", knowledge_point_id="kp-array",
            title="数组", content="## 定义\n数据连续存放。",
        ),
        KnowledgeDocument(
            id="course-test:search", course_id="course-test", knowledge_point_id="kp-search",
            title="二分查找", prerequisite_ids=["kp-array"],
            content="## 条件\n二分查找需要有序且支持随机访问。\n## 边界\n二分查找要明确区间端点。",
        ),
    ]
    results = GraphRAGRetriever(KnowledgeRepository(documents)).retrieve(
        "course-test", "二分查找", top_k=2,
    )
    assert len(results) == 2
    assert {result.knowledge_point_id for result in results} == {"kp-search"}


def test_retrieved_sources_keep_material_version_and_reference_locator():
    document = KnowledgeDocument(
        id="course-test:search", course_id="course-test", knowledge_point_id="kp-search",
        title="二分查找", content="## 条件\n二分查找要求有序数组。",
        version="test-v2", material_path="course-test/search.md",
        source_refs=[{"title": "课程参考", "url": "https://example.org/course", "locator": "查找章节", "verificationStatus": "reference_only"}],
    )
    results = GraphRAGRetriever(KnowledgeRepository([document])).retrieve("course-test", "二分查找")
    source = KnowledgeContextBuilder.sources(results)[0]
    assert source.version == "test-v2"
    assert source.material_path == "course-test/search.md"
    assert source.source_refs[0].locator == "查找章节"


def test_wider_tutor_context_reserves_one_explicit_prerequisite_after_direct_hits():
    basic = KnowledgeDocument(
        id="course-test:basic", course_id="course-test", knowledge_point_id="kp-basic",
        title="基础", content="## 前置概念\n基础数据约定。",
    )
    advanced = KnowledgeDocument(
        id="course-test:search", course_id="course-test", knowledge_point_id="kp-search",
        title="二分查找", prerequisite_ids=["kp-basic"],
        content="\n".join(f"## 二分查找步骤{i}\n二分查找的边界情况{i}。" for i in range(4)),
    )
    results = GraphRAGRetriever(KnowledgeRepository([basic, advanced])).retrieve(
        "course-test", "二分查找", top_k=4,
    )
    assert [item.knowledge_point_id for item in results] == ["kp-search"] * 3 + ["kp-basic"]
