from __future__ import annotations

from sqlalchemy.orm import Session

from app.agents.base import AgentCapability, AgentRequest, AgentResult
from app.domain import EvidenceType
from app.services.learning_evidence import LearningEvidenceRepository


class AssessmentAgent:
    """Read-only explanation of the latest persisted practice evidence."""

    def __init__(self, db: Session, evidence_repo: LearningEvidenceRepository | None = None) -> None:
        self._evidence = evidence_repo or LearningEvidenceRepository(db)

    def run(self, request: AgentRequest) -> AgentResult:
        records = self._evidence.list_recent_by_learner(
            request.learner_id,
            course_id=request.course_id,
            limit=10,
        )
        latest = next(
            (record for record in records if record.evidence_type == EvidenceType.PRACTICE_ANSWER_EVALUATED),
            None,
        )
        if latest is None:
            return AgentResult(
                agent=AgentCapability.ASSESSMENT,
                summary="目前还没有足够记录判断最近一次练习。",
                data={"evidence": None},
                context_used=[],
            )

        payload = latest.payload
        is_correct = payload.get("is_correct")
        score = payload.get("score")
        correctness = "答对了" if is_correct else "这次没有答对"
        score_text = f"得分 {round(float(score) * 100)}%" if score is not None else "暂未记录得分"
        return AgentResult(
            agent=AgentCapability.ASSESSMENT,
            summary=f"最近一次练习{correctness}，{score_text}。掌握度变化由练习评价服务记录。",
            data={
                "evidence": latest.model_dump(mode="json"),
                "is_correct": is_correct,
                "score": score,
                "difficulty": payload.get("difficulty"),
            },
            context_used=["evidence"],
            suggested_actions=[{"type": "retry_practice", "label": "再做一道练习"}],
        )
