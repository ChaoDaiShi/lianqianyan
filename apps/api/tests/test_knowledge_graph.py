from app.knowledge import KnowledgeDocument, KnowledgeGraphGenerator, KnowledgeRepository


def test_course_graph_contains_traceable_nodes_and_edges() -> None:
    repository = KnowledgeRepository(
        [
            KnowledgeDocument(
                id="course-test:deadlock",
                course_id="course-test",
                knowledge_point_id="kp-deadlock",
                title="死锁",
                content="# 定义\n\n互相等待资源。\n\n# 处理\n\n预防、避免、检测与解除。",
            ),
            KnowledgeDocument(
                id="course-test:scheduling",
                course_id="course-test",
                knowledge_point_id="kp-scheduling",
                title="调度",
                content="# 目标\n\n合理分配处理器。",
            ),
        ]
    )

    graph = KnowledgeGraphGenerator(repository).generate("course-test")

    assert graph.generation_mode == "course_grounded"
    assert {node.kind for node in graph.nodes} == {"course", "knowledge_point", "section"}
    assert {edge.relation for edge in graph.edges} >= {"contains", "explains", "precedes"}
    assert all(edge.source_sections for edge in graph.edges)
    assert graph.sources == ["死锁 · 定义", "死锁 · 处理", "调度 · 目标"]


def test_empty_course_graph_is_explicitly_empty() -> None:
    graph = KnowledgeGraphGenerator(KnowledgeRepository([])).generate("missing")
    assert graph.nodes == []
    assert graph.edges == []
    assert graph.sources == []
