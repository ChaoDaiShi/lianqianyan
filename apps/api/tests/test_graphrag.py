from __future__ import annotations

from app.knowledge import KnowledgeDocument, KnowledgeRepository
from app.knowledge.graphrag import GraphRAGRetriever


def _repository() -> KnowledgeRepository:
    return KnowledgeRepository(
        [
            KnowledgeDocument(
                id="course-test:deadlock",
                course_id="course-test",
                knowledge_point_id="kp-deadlock",
                title="死锁",
                content="# 银行家算法\n\n银行家算法用于进行安全性检查。",
                prerequisite_ids=["kp-process"],
            ),
            KnowledgeDocument(
                id="course-test:process",
                course_id="course-test",
                knowledge_point_id="kp-process",
                title="进程基础",
                content="# 进程控制块\n\nPCB 保存进程状态。",
            ),
            KnowledgeDocument(
                id="course-test:pv",
                course_id="course-test",
                knowledge_point_id="kp-pv",
                title="PV 操作",
                content="# 信号量\n\nP 与 V 操作保持同步。",
                prerequisite_ids=["kp-process"],
            ),
        ]
    )


def test_graphrag_expands_a_lexical_seed_through_real_point_edges() -> None:
    results = GraphRAGRetriever(_repository()).retrieve(
        "course-test", "银行家算法", top_k=2
    )

    assert [item.knowledge_point_id for item in results] == [
        "kp-deadlock",
        "kp-process",
    ]
    assert len({item.chunk_id for item in results}) == len(results)


def test_graphrag_is_course_isolated_bounded_and_deterministic() -> None:
    retriever = GraphRAGRetriever(_repository())
    first = retriever.retrieve("course-test", "进程", top_k=2)
    second = retriever.retrieve("course-test", "进程", top_k=2)

    assert [item.chunk_id for item in first] == [item.chunk_id for item in second]
    assert len(first) == 2
    assert retriever.retrieve("missing", "进程", top_k=4) == []
