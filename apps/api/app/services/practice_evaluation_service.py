"""PracticeEvaluationService —— 练习评价应用服务。

职责：把一次「练习评价」视为**一个业务动作**，在单个事务边界内：

    创建 practice_answer_evaluated 证据
    + 投影并更新 MasteryRecord

并确保二者要么一起成功提交、要么一起回滚（避免 Evidence 已提交但 Mastery 更新失败
留下半成功状态）。

本服务控制事务边界：Repository 只做 add/flush，本服务负责统一 commit/rollback。
不依赖 FastAPI。
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain import (
    EvidenceSource,
    EvidenceType,
    MasteryStateOut,
    PracticeEvaluateRequest,
    PracticeEvaluateResponse,
)
from app.services.learning_evidence import LearningEvidenceRepository
from app.services.mastery_projection_service import MasteryProjectionService


class PracticeEvaluationService:
    """练习评价业务编排。"""

    def __init__(self, db: Session) -> None:
        self._db = db
        self._evidence_repo = LearningEvidenceRepository(db)
        self._projection_service = MasteryProjectionService(db)

    def evaluate(self, req: PracticeEvaluateRequest) -> PracticeEvaluateResponse:
        try:
            # 1) 创建评价证据（Assessment 证据，可影响掌握度）
            evidence = self._evidence_repo.create(
                learner_id=req.learner_id,
                evidence_type=EvidenceType.PRACTICE_ANSWER_EVALUATED,
                source=EvidenceSource.LEARNING_SPACE,
                knowledge_point_id=req.knowledge_point_id,
                course_id=req.course_id,
                question_id=req.question_id,
                payload={
                    "is_correct": req.is_correct,
                    "score": req.score,
                    "difficulty": req.difficulty,
                },
            )

            # 2) 投影掌握度
            result = self._projection_service.project(evidence)

            if result is None:
                # 理论上 practice_answer_evaluated 一定可投影；防御性兜底
                result = self._projection_service.get_mastery_state(
                    req.learner_id, req.knowledge_point_id
                )
                mastery_before = result.mastery_score if result else 0.0
                mastery_after = result.mastery_score if result else 0.0
                confidence = result.confidence if result else 0.0
                evidence_count = result.evidence_count if result else 0
            else:
                mastery_before = result.mastery_before
                mastery_after = result.mastery_after
                confidence = result.confidence
                evidence_count = result.evidence_count

            # 3) 将服务端投影结果写回同一条 Evidence，供后续 Tutor/Assessment 解释。
            # 这些字段来自 ProjectionResult，客户端与 Agent 都不能伪造或写入。
            self._evidence_repo.update_payload(
                evidence.id,
                {
                    "mastery_before": mastery_before,
                    "mastery_after": mastery_after,
                    "confidence": confidence,
                    "evidence_count": evidence_count,
                },
            )

            # 4) 单一提交点 —— Evidence 与 Mastery 同事务
            self._db.commit()
        except Exception:
            self._db.rollback()
            raise

        return PracticeEvaluateResponse(
            evidence=evidence,
            mastery_before=mastery_before,
            mastery_after=mastery_after,
            confidence=confidence,
            evidence_count=evidence_count,
            message="小涟已记录本次练习结果并更新掌握度",
        )
