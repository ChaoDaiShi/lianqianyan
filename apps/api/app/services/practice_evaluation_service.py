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

import logging

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.adaptive.models import AdaptiveQuestionSubmission
from app.adaptive.submissions import AdaptiveQuestionSubmissionStore, answer_fingerprint
from app.practice.catalog import PracticeCatalog, public_catalog
from app.domain import (
    EvidenceSource,
    EvidenceType,
    MasteryStateOut,
    PracticeEvaluateRequest,
    PracticeEvaluateResponse,
    ReplanningResult,
    ReplanningStatus,
)
from app.domain.models import MasteryRecord, PracticeQuestionCatalogOut, PracticeSubmissionRequest, PracticeSubmissionResponse
from app.services.dynamic_replanning_service import DynamicReplanningService
from app.services.learning_evidence import LearningEvidenceRepository
from app.services.mastery_projection_service import MasteryProjectionService

logger = logging.getLogger(__name__)
PRACTICE_GRADING_VERSION = "server-objective-choice-v1"


class PracticeEvaluationService:
    """练习评价业务编排。"""

    def __init__(
        self,
        db: Session,
        replanning_service: DynamicReplanningService | None = None,
    ) -> None:
        self._db = db
        self._evidence_repo = LearningEvidenceRepository(db)
        self._projection_service = MasteryProjectionService(db)
        self._replanning = replanning_service or DynamicReplanningService(db)
        self._catalog = PracticeCatalog()
        self._submissions = AdaptiveQuestionSubmissionStore(db)

    def list_practice_questions(
        self, learner_id: str, course_id: str, knowledge_point_id: str
    ) -> PracticeQuestionCatalogOut:
        catalog = self._catalog.list_practice(course_id, knowledge_point_id)
        recorded_results = {}
        for question in catalog["questions"]:
            question_version = question.get("version") or catalog["version"]
            receipt = self._get_seen_item(learner_id, course_id, question["id"], question_version)
            if receipt is None:
                continue
            saved_result = receipt.result_json or {}
            option_id = saved_result.get("option_id")
            if option_id is None:
                option_id = next(
                    (
                        option["id"]
                        for option in question["options"]
                        if answer_fingerprint("", option["id"]) == receipt.answer_hash
                    ),
                    None,
                )
            if option_id is None:
                continue
            recorded_results[question["id"]] = {
                "optionId": option_id,
                "isCorrect": receipt.is_correct,
                "score": receipt.score,
                "feedback": saved_result.get("feedback", "练习结果已记录。"),
            }
        return PracticeQuestionCatalogOut.model_validate(
            public_catalog(catalog, recorded_results)
        )

    def evaluate_catalog_question(
        self, request: PracticeSubmissionRequest
    ) -> PracticeSubmissionResponse:
        question = self._catalog.get_practice_question(
            request.course_id, request.knowledge_point_id, request.question_id
        )
        if question is None:
            raise HTTPException(status_code=404, detail="practice question not found")
        correct_option_id = question.get("correctOptionId")
        option = next(
            (item for item in question.get("options", []) if item.get("id") == request.option_id),
            None,
        )
        if option is None:
            raise HTTPException(status_code=422, detail="optionId is not part of this question")

        question_version = question.get("version") or self._catalog.load(request.course_id).get("version", "")
        submission_id = f"{request.course_id}:{request.question_id}:{question_version}"
        answer_hash = answer_fingerprint("", request.option_id)
        receipt = self._submissions.get_counted_item(
            request.learner_id,
            request.course_id,
            request.question_id,
            question_version,
        ) or self._get_seen_item(
            request.learner_id, request.course_id, request.question_id, question_version
        ) or self._submissions.get_by_submission_id(request.learner_id, submission_id)
        if receipt is not None:
            return self._submission_response(receipt, answer_hash)

        is_correct = request.option_id == correct_option_id
        score = 1.0 if is_correct else 0.0
        feedback = self._practice_feedback(question, is_correct)
        payload = {
            "score": score,
            "is_correct": is_correct,
            "difficulty": question["difficulty"],
            "grading_source": "server",
            "grading_version": PRACTICE_GRADING_VERSION,
            "question_version": question_version,
            "independent": False,
            "hint_used": False,
            "counts_for_mastery": True,
            "option_id": request.option_id,
            "answer": option["label"],
        }
        if question.get("misconceptionCode"):
            payload["misconception_code"] = question["misconceptionCode"]

        try:
            evidence = self._evidence_repo.create(
                learner_id=request.learner_id,
                evidence_type=EvidenceType.PRACTICE_ANSWER_EVALUATED,
                source=EvidenceSource.LEARNING_SPACE,
                knowledge_point_id=request.knowledge_point_id,
                course_id=request.course_id,
                question_id=request.question_id,
                session_id=request.session_id,
                payload=payload,
            )
            projection = self._projection_service.project(evidence)
            if projection is None:
                raise ValueError("catalog question did not produce a mastery projection")
            evidence = self._evidence_repo.update_payload(
                evidence.id,
                {
                    "mastery_before": projection.mastery_before,
                    "mastery_after": projection.mastery_after,
                    "confidence": projection.confidence,
                    "evidence_count": projection.evidence_count,
                },
            ) or evidence
            pending_replanning = {
                "status": "not_needed",
                "performed": False,
                "reason_codes": [],
                "previous_plan_id": None,
                "new_plan": None,
                "previous_top_task": None,
                "new_top_task": None,
            }
            result_json = {
                "evidence": evidence.model_dump(mode="json"),
                "mastery_before": projection.mastery_before,
                "mastery_after": projection.mastery_after,
                "confidence": projection.confidence,
                "evidence_count": projection.evidence_count,
                "message": "练习结果已由服务端评分并记录",
                "replanning": pending_replanning,
                "is_correct": is_correct,
                "score": score,
                "feedback": feedback,
                "grading_version": PRACTICE_GRADING_VERSION,
                "already_recorded": False,
                "option_id": request.option_id,
            }
            receipt = self._submissions.save_result(
                learner_id=request.learner_id,
                course_id=request.course_id,
                knowledge_point_id=request.knowledge_point_id,
                question_id=request.question_id,
                question_version=question_version,
                stage="practice",
                session_id=request.session_id,
                submission_id=submission_id,
                answer_hash=answer_hash,
                score=score,
                is_correct=is_correct,
                difficulty=question["difficulty"],
                grading_source="server",
                grading_version=PRACTICE_GRADING_VERSION,
                independent=False,
                hint_used=False,
                counts_for_mastery=True,
                misconception_code=question.get("misconceptionCode"),
                evidence_id=evidence.id,
                result_json=result_json,
            )
            self._db.commit()
        except IntegrityError:
            self._db.rollback()
            saved = self._submissions.get_counted_item(
                request.learner_id,
                request.course_id,
                request.question_id,
                question_version,
            ) or self._get_seen_item(
                request.learner_id, request.course_id, request.question_id, question_version
            ) or self._submissions.get_by_submission_id(request.learner_id, submission_id)
            if saved is not None:
                return self._submission_response(saved, answer_hash)
            raise
        except Exception:
            self._db.rollback()
            raise

        replanning = self._run_replanning(request.learner_id, request.course_id)
        receipt.result_json = {
            **result_json,
            "replanning": replanning,
        }
        try:
            self._db.commit()
        except Exception:
            self._db.rollback()
            logger.exception("could not persist practice replanning result")
        return PracticeSubmissionResponse.model_validate(
            receipt.result_json | {"already_recorded": False}
        )

    @staticmethod
    def _practice_feedback(question: dict, is_correct: bool) -> str:
        answer_label = next(
            option["label"]
            for option in question["options"]
            if option["id"] == question["correctOptionId"]
        )
        prefix = "回答正确。" if is_correct else f"正确选项：{answer_label}。"
        return f"{prefix}{question.get('explanation', '')}".strip()

    def _get_seen_item(
        self, learner_id: str, course_id: str, question_id: str, question_version: str
    ) -> AdaptiveQuestionSubmission | None:
        return self._db.scalar(
            select(AdaptiveQuestionSubmission)
            .where(
                AdaptiveQuestionSubmission.learner_id == learner_id,
                AdaptiveQuestionSubmission.course_id == course_id,
                AdaptiveQuestionSubmission.question_id == question_id,
                AdaptiveQuestionSubmission.question_version == question_version,
            )
            .order_by(AdaptiveQuestionSubmission.created_at.desc())
            .limit(1)
        )

    def _submission_response(self, receipt, answer_hash: str) -> PracticeSubmissionResponse:
        if receipt.answer_hash != answer_hash:
            if receipt.counts_for_mastery:
                raise HTTPException(status_code=409, detail="this question version has already been answered")
        result = dict(receipt.result_json or {})
        result["already_recorded"] = True
        evidence = None
        if receipt.evidence_id is not None:
            evidence = self._evidence_repo.get_by_id(receipt.evidence_id)
        if result.get("evidence") is None and evidence is not None:
            result["evidence"] = evidence.model_dump(mode="json")
        if evidence is not None:
            saved_projection = evidence.payload or {}
            payload_keys = {
                "mastery_before": ("mastery_before", "masteryBefore"),
                "mastery_after": ("mastery_after", "masteryAfter"),
                "confidence": ("confidence",),
                "evidence_count": ("evidence_count", "evidenceCount"),
            }
            for response_key, source_keys in payload_keys.items():
                if result.get(response_key) is not None:
                    continue
                saved_value = next(
                    (saved_projection[key] for key in source_keys if saved_projection.get(key) is not None),
                    None,
                )
                if saved_value is not None:
                    result[response_key] = saved_value
        if not receipt.counts_for_mastery and any(
            result.get(key) is None
            for key in ("mastery_before", "mastery_after", "confidence", "evidence_count")
        ):
            current = self._db.scalar(
                select(MasteryRecord).where(
                    MasteryRecord.learner_id == receipt.learner_id,
                    MasteryRecord.knowledge_point_id == receipt.knowledge_point_id,
                )
            )
            current_projection = {
                "mastery_before": current.mastery_score if current else 0.0,
                "mastery_after": current.mastery_score if current else 0.0,
                "confidence": current.confidence if current else 0.0,
                "evidence_count": current.evidence_count if current else 0,
            }
            for key, value in current_projection.items():
                result.setdefault(key, value)
                if result[key] is None:
                    result[key] = value
        result.setdefault("message", "练习结果已由服务端评分并记录")
        result.setdefault("replanning", {
            "status": "not_needed",
            "performed": False,
            "reason_codes": [],
            "previous_plan_id": None,
            "new_plan": None,
            "previous_top_task": None,
            "new_top_task": None,
        })
        result.setdefault("is_correct", receipt.is_correct)
        result.setdefault("score", receipt.score)
        result.setdefault("grading_version", receipt.grading_version)
        result.setdefault("feedback", "练习结果已记录。")
        return PracticeSubmissionResponse.model_validate(result)

    def _run_replanning(self, learner_id: str, course_id: str) -> dict:
        try:
            result = self._replanning.replan(learner_id, course_id)
        except Exception:
            self._db.rollback()
            logger.exception(
                "dynamic replanning failed after practice commit: learner_id=%s course_id=%s",
                learner_id,
                course_id,
            )
            result = ReplanningResult(status=ReplanningStatus.FAILED, performed=False)
        return result.model_dump(mode="json")

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

        try:
            replanning = self._replanning.replan(req.learner_id, req.course_id)
        except Exception:
            self._db.rollback()
            logger.exception(
                "dynamic replanning failed after practice commit: learner_id=%s course_id=%s",
                req.learner_id,
                req.course_id,
            )
            replanning = ReplanningResult(
                status=ReplanningStatus.FAILED,
                performed=False,
            )

        return PracticeEvaluateResponse(
            evidence=evidence,
            mastery_before=mastery_before,
            mastery_after=mastery_after,
            confidence=confidence,
            evidence_count=evidence_count,
            message="小涟已记录本次练习结果并更新掌握度",
            replanning=replanning,
        )
