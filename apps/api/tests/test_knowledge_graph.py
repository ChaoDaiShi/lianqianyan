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
                prerequisite_ids=["kp-process"],
            ),
            KnowledgeDocument(
                id="course-test:process",
                course_id="course-test",
                knowledge_point_id="kp-process",
                title="进程基础",
                content="# 定义\n\n运行中的程序实例。",
            ),
        ]
    )

    graph = KnowledgeGraphGenerator(repository).generate(
        "course-test", course_label="测试课程"
    )

    assert graph.generation_mode == "graph_rag_course_grounded"
    assert graph.nodes[0].label == "测试课程"
    assert {node.kind for node in graph.nodes} == {"course", "knowledge_point", "section"}
    assert {edge.relation for edge in graph.edges} >= {"contains", "explains", "precedes"}
    assert all(edge.source_sections for edge in graph.edges)
    assert graph.sources == ["死锁 · 定义", "死锁 · 处理", "course-test:deadlock · prerequisite_ids", "进程基础 · 定义"]
    assert {(edge.source, edge.target) for edge in graph.edges if edge.relation == "precedes"} == {
        ("point:kp-process", "point:kp-deadlock"),
    }


def test_empty_course_graph_is_explicitly_empty() -> None:
    graph = KnowledgeGraphGenerator(KnowledgeRepository([])).generate("missing")
    assert graph.nodes == []
    assert graph.edges == []
    assert graph.sources == []
