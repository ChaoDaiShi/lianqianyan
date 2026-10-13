from __future__ import annotations

import math
import re
import uuid
import json
from copy import deepcopy
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.adaptive.catalog import (
    ACTION_META,
    ACTION_TYPES,
    CATALOG_VERSION,
    MODEL_VERSION,
    POLICY_VERSION,
    TOPICS,
    catalog_payload,
    public_question,
)
from app.adaptive.models import AdaptiveKnowledgeState, AdaptiveSessionRecord
from app.adaptive.models import AdaptiveQuestionSubmission
from app.adaptive.submissions import AdaptiveQuestionSubmissionStore, answer_fingerprint
from app.core.time import utc_now
from app.domain import (
    EvidenceSource,
    EvidenceType,
    LearningEvidence,
)
from app.services.dynamic_replanning_service import DynamicReplanningService
from app.services.learning_evidence import LearningEvidenceRepository
from app.services.mastery_projection_service import MasteryProjectionService


EXPERIMENT_LABELS = {
    "A": "常规学习",
    "B": "课程固定策略",
    "C": "基于证据的动态策略",
    "D": "LEAP 完整策略",
}
QUESTION_BANK_PATH = Path(__file__).resolve().parents[1] / "practice" / "data" / "course-ds.json"
PRACTICE_GRADING_VERSION = "server-objective-choice-v1"
LEAP_TEXT_GRADING_VERSION = "leap-rubric-matcher-v1"


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat(timespec="seconds") + "Z"


class AdaptiveLearningService:
    """Durable, deterministic learning loop for the course-ds LEAP pilot."""

    def __init__(self, db: Session) -> None:
        self._db = db
        self._evidence = LearningEvidenceRepository(db)
        self._mastery = MasteryProjectionService(db)
        self._submissions = AdaptiveQuestionSubmissionStore(db)

    @staticmethod
    def _load_question_bank() -> dict:
        try:
            return json.loads(QUESTION_BANK_PATH.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return {"version": "unavailable", "questions": []}

    @staticmethod
    def _public_bank_question(question: dict, novelty: str) -> dict:
        return {
            "id": question["id"],
            "version": question.get("version"),
            "novelty": novelty,
            "prompt": question["prompt"],
            "options": [
                {"id": option["id"], "text": option.get("label", option.get("text", ""))}
                for option in question.get("options", [])
            ],
            "responseMode": "choice",
        }

    def _bank_questions(self, knowledge_point_id: str, stage: str) -> list[dict]:
        bank = self._load_question_bank()
        return [
            question
            for question in bank.get("questions", [])
            if question.get("courseId") == "course-ds"
            and question.get("knowledgePointId") == knowledge_point_id
            and question.get("stage") == stage
        ]

    @staticmethod
    def _question_version(question: dict, bank: dict | None = None) -> str:
        return str(question.get("version") or (bank or {}).get("version") or CATALOG_VERSION)

    @staticmethod
    def _grading_version(question: dict) -> str:
        return (
            PRACTICE_GRADING_VERSION
            if question.get("correctOptionId") is not None
            else LEAP_TEXT_GRADING_VERSION
        )

    @staticmethod
    def _item_key(question_id: str, version: str) -> str:
        return AdaptiveQuestionSubmissionStore.item_key(question_id, version)

    def _used_item_keys(
        self,
        learner_id: str,
        course_id: str,
        knowledge_point_id: str,
        current_snapshot: dict | None = None,
    ) -> set[str]:
        used: set[str] = set()
        rows = self._db.scalars(
            select(AdaptiveSessionRecord).where(
                AdaptiveSessionRecord.learner_id == learner_id,
                AdaptiveSessionRecord.course_id == course_id,
                AdaptiveSessionRecord.topic_id.in_(
                    topic_id
                    for topic_id, topic in TOPICS.items()
                    if topic["knowledgePointId"] == knowledge_point_id
                ),
            )
        ).all()
        snapshots = [row.snapshot for row in rows]
        if current_snapshot is not None:
            snapshots.append(current_snapshot)
        for snapshot in snapshots:
            private = snapshot.get("_private", {})
            assignments = snapshot.get("_questionAssignments", {})
            for stage in ("practice", "probe", "retest"):
                question = snapshot.get(f"{stage}Question")
                if question is None:
                    continue
                assignment = assignments.get(stage, {})
                grading = private.get("grading", {}).get(stage, {})
                version = (
                    assignment.get("version")
                    or question.get("version")
                    or grading.get("version")
                    or snapshot.get("catalogVersion")
                    or CATALOG_VERSION
                )
                used.add(self._item_key(question["id"], str(version)))
        receipts = self._db.scalars(
            select(AdaptiveQuestionSubmission).where(
                AdaptiveQuestionSubmission.learner_id == learner_id,
                AdaptiveQuestionSubmission.course_id == course_id,
                AdaptiveQuestionSubmission.knowledge_point_id == knowledge_point_id,
                AdaptiveQuestionSubmission.assessment_item_key.is_not(None),
            )
        ).all()
        used.update(receipt.assessment_item_key for receipt in receipts if receipt.assessment_item_key)
        return used

    def _question_availability(
        self,
        learner_id: str,
        course_id: str,
        knowledge_point_id: str,
        snapshot: dict | None = None,
    ) -> dict:
        used = self._used_item_keys(learner_id, course_id, knowledge_point_id, snapshot)
        available: dict[str, dict[str, str | None]] = {}
        for stage in ("practice", "probe", "retest"):
            questions = self._bank_questions(knowledge_point_id, stage)
            unseen = [
                item
                for item in questions
                if self._item_key(item["id"], self._question_version(item)) not in used
            ]
            if unseen:
                available[stage] = {
                    "status": "available",
                    "novelty": "new",
                    "message": "有未见过的新题可用。",
                }
            elif stage == "practice" and questions:
                available[stage] = {
                    "status": "available",
                    "novelty": "review",
                    "message": "新训练题已用完，可复习旧题；复习不会记作新的独立证据。",
                }
            else:
                available[stage] = {
                    "status": "exhausted",
                    "novelty": None,
                    "message": "当前没有未见过的新题；可以复习本主题或转到其他主题。",
                }
        return available

    def _assign_question(
        self,
        row: AdaptiveSessionRecord,
        snapshot: dict,
        stage: str,
    ) -> dict | None:
        question_key = f"{stage}Question"
        if snapshot.get(question_key) is not None:
            return snapshot.get("_private", {}).get("grading", {}).get(stage)
        topic = TOPICS[row.topic_id]
        bank = self._load_question_bank()
        questions = self._bank_questions(topic["knowledgePointId"], stage)
        used = self._used_item_keys(
            row.learner_id, row.course_id, topic["knowledgePointId"], snapshot
        )
        question = next(
            (
                item
                for item in questions
                if self._item_key(item["id"], self._question_version(item, bank)) not in used
            ),
            None,
        )
        novelty = "new"
        if question is None and stage == "practice" and questions:
            question = questions[0]
            novelty = "review"
        if question is None:
            return None

        version = self._question_version(question, bank)
        assignment = {
            "assignmentId": str(uuid.uuid4()),
            "questionId": question["id"],
            "version": version,
            "novelty": novelty,
        }
        snapshot.setdefault("_questionAssignments", {})[stage] = assignment
        snapshot.setdefault("_private", {}).setdefault("grading", {})[stage] = {
            **question,
            "version": version,
        }
        snapshot[question_key] = self._public_bank_question(question, novelty)
        return snapshot["_private"]["grading"][stage]

    def _submission_data(
        self,
        row: AdaptiveSessionRecord,
        snapshot: dict,
        stage: str,
        question: dict,
        answer: str,
        option_id: str | None,
        counts_for_mastery: bool,
    ) -> tuple[str, str, str]:
        version = self._question_version(question, self._load_question_bank())
        item_key = self._item_key(question["id"], version)
        assignment = snapshot.get("_questionAssignments", {}).get(stage, {})
        if counts_for_mastery:
            submission_id = f"{row.course_id}:{question['id']}:{version}"
        else:
            assignment_id = assignment.get("assignmentId", f"{row.id}:{stage}:{item_key}")
            submission_id = f"{row.id}:{stage}:{assignment_id}"
        return submission_id, answer_fingerprint(answer, option_id), version

    def _existing_submission(
        self,
        *,
        learner_id: str,
        course_id: str,
        submission_id: str,
        question_id: str,
        question_version: str,
        answer_hash: str,
        counts_for_mastery: bool,
        session_id: str | None = None,
        stage: str | None = None,
    ) -> AdaptiveQuestionSubmission | None:
        receipt = self._submissions.get_by_submission_id(learner_id, submission_id)
        if receipt is None and counts_for_mastery:
            receipt = self._submissions.get_counted_item(
                learner_id, course_id, question_id, question_version
            )
        if receipt is None and session_id is not None and stage is not None:
            receipt = self._submissions.get_for_assignment(
                learner_id, session_id, stage, question_id, question_version
            )
        if receipt is None:
            return None
        if receipt.answer_hash != answer_hash:
            raise HTTPException(
                status_code=409,
                detail="this question version has already been answered",
            )
        return receipt

    def _save_submission(
        self,
        *,
        row: AdaptiveSessionRecord,
        snapshot: dict,
        stage: str,
        question: dict,
        answer: str,
        option_id: str | None,
        score: float,
        feedback: str,
        evidence: dict,
        independent: bool,
        hint_used: bool,
        counts_for_mastery: bool,
        misconception_code: str | None,
        result_json: dict,
    ):
        version = self._question_version(question, self._load_question_bank())
        submission_id, answer_hash, _ = self._submission_data(
            row,
            snapshot,
            stage,
            question,
            answer,
            option_id,
            counts_for_mastery,
        )
        try:
            return self._submissions.save_result(
                learner_id=row.learner_id,
                course_id=row.course_id,
                knowledge_point_id=row.snapshot["knowledgePointId"],
                question_id=question["id"],
                question_version=version,
                stage=stage,
                session_id=row.id,
                submission_id=submission_id,
                answer_hash=answer_hash,
                score=score,
                is_correct=score >= 0.75,
                difficulty=float(question.get("difficulty", 0.5)),
                grading_source="server",
                grading_version=self._grading_version(question),
                independent=independent,
                hint_used=hint_used,
                counts_for_mastery=counts_for_mastery,
                misconception_code=misconception_code,
                evidence_id=evidence["id"] if evidence else None,
                result_json=result_json,
            )
        except IntegrityError:
            self._db.rollback()
            existing = self._existing_submission(
                learner_id=row.learner_id,
                course_id=row.course_id,
                submission_id=submission_id,
                question_id=question["id"],
                question_version=version,
                answer_hash=answer_hash,
                counts_for_mastery=counts_for_mastery,
                session_id=row.id,
                stage=stage,
            )
            if existing is not None:
                saved_row = self._db.get(AdaptiveSessionRecord, row.id)
                return self._replay_receipt(saved_row or row, existing)
            raise

    def _saved_assessment(self, receipt: AdaptiveQuestionSubmission) -> dict:
        return {
            "questionId": receipt.question_id,
            "questionVersion": receipt.question_version,
            "stage": receipt.stage,
            "gradingVersion": receipt.grading_version,
            "score": receipt.score,
            "isCorrect": receipt.is_correct,
            "feedback": (receipt.result_json or {}).get("feedback"),
            "independent": receipt.independent,
            "hintUsed": receipt.hint_used,
            "countsForMastery": receipt.counts_for_mastery,
            "evidenceId": receipt.evidence_id,
        }

    def _replay_receipt(
        self, row: AdaptiveSessionRecord, receipt: AdaptiveQuestionSubmission
    ) -> dict:
        return {
            **self._public(row.snapshot),
            "alreadyRecorded": True,
            "savedAssessment": self._saved_assessment(receipt),
        }

    def _commit_session_submission(
        self,
        *,
        row: AdaptiveSessionRecord,
        snapshot: dict,
        stage: str,
        question: dict,
        answer: str,
        option_id: str | None,
        score: float,
        feedback: str,
        evidence: dict,
        independent: bool,
        hint_used: bool,
        counts_for_mastery: bool,
        misconception_code: str | None,
        phase: str,
    ) -> tuple[dict, AdaptiveQuestionSubmission | None]:
        self._save(row, snapshot, phase=phase)
        response = {**self._public(snapshot), "alreadyRecorded": False}
        receipt = self._save_submission(
            row=row,
            snapshot=snapshot,
            stage=stage,
            question=question,
            answer=answer,
            option_id=option_id,
            score=score,
            feedback=feedback,
            evidence=evidence,
            independent=independent,
            hint_used=hint_used,
            counts_for_mastery=counts_for_mastery,
            misconception_code=misconception_code,
            result_json={
                "questionId": question["id"],
                "questionVersion": self._question_version(question, self._load_question_bank()),
                "stage": stage,
                "gradingVersion": self._grading_version(question),
                "score": score,
                "isCorrect": score >= 0.75,
                "feedback": feedback,
                "independent": independent,
                "hintUsed": hint_used,
                "countsForMastery": counts_for_mastery,
                "evidenceId": evidence["id"] if evidence else None,
                "replanning": response.get("replanning"),
            },
        )
        if isinstance(receipt, dict):
            return receipt, None
        self._db.commit()
        return response, receipt

    def _replan_after_assessment(
        self,
        row: AdaptiveSessionRecord,
        receipt: AdaptiveQuestionSubmission | None,
    ) -> dict:
        try:
            result = DynamicReplanningService(self._db).replan(
                row.learner_id, row.course_id
            )
            replanning = {
                "status": result.status.value,
                "reasonCodes": [reason.value for reason in result.reason_codes],
                "previousPlanId": result.previous_plan_id,
                "newPlanId": result.new_plan.id if result.new_plan else None,
            }
        except Exception:
            self._db.rollback()
            replanning = {
                "status": "failed",
                "reasonCodes": ["REPLAN_EXECUTION_FAILED"],
                "previousPlanId": None,
                "newPlanId": None,
            }

        saved_row = self._db.get(AdaptiveSessionRecord, row.id)
        if saved_row is None:
            raise RuntimeError("saved adaptive assessment session disappeared")
        snapshot = deepcopy(saved_row.snapshot)
        snapshot["assessmentStatus"] = "saved"
        snapshot["replanning"] = replanning
        if replanning["status"] == "performed" and snapshot.get("nextStep") is not None:
            snapshot["nextStep"]["reason"] += " 本次证据已触发现有 course-ds 学习计划重排。"
        self._save(saved_row, snapshot, phase="completed")
        response = {**self._public(snapshot), "alreadyRecorded": False}
        if receipt is not None:
            saved_receipt = self._db.get(AdaptiveQuestionSubmission, receipt.id)
            if saved_receipt is not None:
                outcome = snapshot.get("outcome") or {}
                saved_receipt.result_json = {
                    "questionId": saved_receipt.question_id,
                    "questionVersion": saved_receipt.question_version,
                    "stage": saved_receipt.stage,
                "gradingVersion": saved_receipt.grading_version,
                    "score": saved_receipt.score,
                    "isCorrect": saved_receipt.is_correct,
                    "feedback": outcome.get("feedback"),
                    "independent": saved_receipt.independent,
                    "hintUsed": saved_receipt.hint_used,
                    "countsForMastery": saved_receipt.counts_for_mastery,
                    "evidenceId": saved_receipt.evidence_id,
                    "replanning": replanning,
                }
        self._db.commit()
        return response

    @staticmethod
    def get_catalog() -> dict:
        return catalog_payload()

    def create_session(
        self,
        learner_id: str,
        course_id: str,
        topic_id: str,
        policy: str,
        experiment_group: str,
        ablation: str = "none",
        time_budget_minutes: int = 25,
        from_session_id: str | None = None,
    ) -> dict:
        preferred_action = None
        recommendation_reason = None
        continuation_pre_score = None
        continue_same_topic = False
        reused_diagnostic: AdaptiveQuestionSubmission | None = None
        if from_session_id is not None:
            source = self._session_record(from_session_id, learner_id)
            if source.course_id != course_id:
                raise HTTPException(status_code=404, detail="source session not found")
            source_snapshot = source.snapshot
            next_step = source_snapshot.get("nextStep")
            if source.phase != "completed" or next_step is None:
                raise HTTPException(status_code=409, detail="source session has no completed next step")
            topic_id = next_step["topicId"]
            continue_same_topic = topic_id == source.topic_id
            preferred_action = next_step["actionType"]
            recommendation_reason = next_step["reason"]
            policy = source.policy
            experiment_group = source.experiment_group
            ablation = source.ablation
            time_budget_minutes = source_snapshot.get("_timeBudgetMinutes", time_budget_minutes)
            if continue_same_topic:
                continuation_pre_score = (
                    source.retest_score
                    if source.retest_score is not None
                    else source.post_score
                )
        if course_id != "course-ds" or topic_id not in TOPICS:
            raise HTTPException(status_code=422, detail="topicId 必须属于 course-ds 课程目录")
        if policy not in {"leap", "fixed"}:
            raise HTTPException(status_code=422, detail="policy 必须为 leap 或 fixed")
        if experiment_group not in EXPERIMENT_LABELS:
            raise HTTPException(status_code=422, detail="experimentGroup 必须为 A、B、C 或 D")
        if ablation not in {"none", "misconception", "prerequisites", "ranking"}:
            raise HTTPException(status_code=422, detail="ablation 值不受支持")

        topic = TOPICS[topic_id]
        now = utc_now()
        session_id = str(uuid.uuid4())
        diagnostic = topic["diagnostic"]
        knowledge_state = self._sync_state_cache(
            learner_id, course_id, topic_id, create=True
        )
        snapshot = {
            "id": session_id,
            "learnerId": learner_id,
            "courseId": course_id,
            "topicId": topic_id,
            "topicName": topic["name"],
            "knowledgePointId": topic["knowledgePointId"],
            "policy": policy,
            "experimentGroup": experiment_group,
            "ablation": ablation,
            "catalogVersion": CATALOG_VERSION,
            "policyVersion": POLICY_VERSION,
            "phase": "diagnostic",
            "createdAt": _iso(now),
            "updatedAt": _iso(now),
            "diagnosticQuestion": public_question(diagnostic),
            "practiceQuestion": None,
            "probeQuestion": None,
            "retestQuestion": None,
            "diagnosis": None,
            "decision": None,
            "teaching": None,
            "outcome": None,
            "state": knowledge_state,
            "evidence": [],
            "nextStep": None,
            "retestDueAt": None,
            "assessmentStatus": "pending",
            "replanning": {
                "status": "not_needed",
                "reasonCodes": [],
                "previousPlanId": None,
                "newPlanId": None,
            },
            "questionAvailability": {},
            "_questionAssignments": {},
            "_private": {
                "grading": {"diagnostic": diagnostic},
                "interventionEvidenceId": None,
                "preferredActionType": preferred_action,
                "recommendationReason": recommendation_reason,
            },
            "_timeBudgetMinutes": max(3, int(time_budget_minutes)),
        }
        snapshot["questionAvailability"] = self._question_availability(
            learner_id, course_id, topic["knowledgePointId"], snapshot
        )
        if not continue_same_topic:
            reused_diagnostic = self._submissions.get_counted_item(
                learner_id,
                course_id,
                diagnostic["id"],
                snapshot["catalogVersion"],
            )
            if reused_diagnostic is not None and reused_diagnostic.stage != "diagnostic":
                reused_diagnostic = None
        if reused_diagnostic is not None:
            topic_prerequisites = self._prerequisite_statuses(learner_id, topic)
            active_code = (
                reused_diagnostic.misconception_code
                if reused_diagnostic.score < 0.75
                else None
            )
            snapshot["phase"] = "decision"
            snapshot["assessmentStatus"] = "saved"
            snapshot["diagnosis"] = {
                "misconceptionCode": active_code,
                "title": topic["misconceptionTitle"] if active_code else "当前已保存诊断未显示该误解",
                "reason": "同一诊断题版本已有服务端评分；本会话复用已保存结果，不重复提交诊断证据。",
                "confidence": 0.5,
                "needsProbe": True,
                "prerequisites": topic_prerequisites,
                "evidenceIds": [reused_diagnostic.evidence_id]
                if reused_diagnostic.evidence_id
                else [],
            }
            snapshot["decision"] = self._decision(
                snapshot,
                topic,
                topic_prerequisites,
                preferred_action,
            )
            continuation_pre_score = reused_diagnostic.score
        if continue_same_topic and knowledge_state["evidenceCount"] > 0:
            topic_prerequisites = self._prerequisite_statuses(learner_id, topic)
            misconception = max(
                knowledge_state["misconceptions"] or [],
                key=lambda item: item["probability"],
                default=None,
            )
            active_code = (
                misconception["code"]
                if misconception is not None
                and misconception["probability"] >= 0.4
                and misconception["code"] == topic["misconceptionCode"]
                else None
            )
            evidence_ids = list(
                self._db.scalars(
                    select(LearningEvidence.id)
                    .where(
                        LearningEvidence.learner_id == learner_id,
                        LearningEvidence.knowledge_point_id == topic["knowledgePointId"],
                    )
                    .order_by(LearningEvidence.occurred_at.desc())
                    .limit(3)
                ).all()
            )
            snapshot["phase"] = "decision"
            snapshot["diagnosis"] = {
                "misconceptionCode": active_code,
                "title": topic["misconceptionTitle"] if active_code else "当前证据未显示该误解",
                "reason": f"复用已记录知识状态和前一会话建议；此主题已有证据，因此不重复出同一道诊断题。前一建议：{recommendation_reason}",
                "confidence": round(min(0.85, 0.35 + 0.06 * knowledge_state["evidenceCount"]), 2),
                "needsProbe": True,
                "prerequisites": topic_prerequisites,
                "evidenceIds": evidence_ids,
            }
            snapshot["decision"] = self._decision(
                snapshot,
                topic,
                topic_prerequisites,
                preferred_action,
            )
        record = AdaptiveSessionRecord(
            id=session_id,
            learner_id=learner_id,
            course_id=course_id,
            topic_id=topic_id,
            policy=policy,
            experiment_group=experiment_group,
            ablation=ablation,
            phase=snapshot["phase"],
            snapshot=snapshot,
            pre_score=continuation_pre_score,
            created_at=now,
            updated_at=now,
        )
        self._db.add(record)
        self._db.flush()
        self._save(record, snapshot, phase=snapshot["phase"])
        self._db.commit()
        return self._public(snapshot)

    def list_sessions(self, learner_id: str, course_id: str = "course-ds") -> list[dict]:
        rows = self._db.scalars(
            select(AdaptiveSessionRecord)
            .where(
                AdaptiveSessionRecord.learner_id == learner_id,
                AdaptiveSessionRecord.course_id == course_id,
            )
            .order_by(AdaptiveSessionRecord.created_at.desc())
        ).all()
        return [self._public(row.snapshot) for row in rows]

    def get_session(
        self,
        session_id: str,
        learner_id: str | None = None,
        course_id: str | None = None,
    ) -> dict:
        row = self._session_record(session_id, learner_id)
        if course_id is not None and row.course_id != course_id:
            raise HTTPException(status_code=404, detail="session not found")
        return self._public(row.snapshot)

    def diagnose(
        self,
        session_id: str,
        learner_id: str,
        answer: str,
        option_id: str | None,
        duration_seconds: int,
    ) -> dict:
        row = self._session_record(session_id, learner_id)
        snapshot = deepcopy(row.snapshot)
        topic = TOPICS[row.topic_id]
        spec = dict(snapshot["_private"]["grading"]["diagnostic"])
        spec["version"] = snapshot.get("catalogVersion", CATALOG_VERSION)
        submission_id, answer_hash, version = self._submission_data(
            row, snapshot, "diagnostic", spec, answer, option_id, True
        )
        existing = self._existing_submission(
            learner_id=learner_id,
            course_id=row.course_id,
            submission_id=submission_id,
            question_id=spec["id"],
            question_version=version,
            answer_hash=answer_hash,
            counts_for_mastery=True,
        )
        if existing is not None:
            if existing.session_id == row.id:
                return self._replay_receipt(row, existing)
            prerequisites = self._prerequisite_statuses(learner_id, topic)
            score = existing.score
            snapshot["diagnosis"] = {
                "misconceptionCode": existing.misconception_code,
                "title": topic["misconceptionTitle"] if existing.misconception_code else "已记录的诊断未显示该误解",
                "reason": "该题目版本已有服务端评分；本会话复用已保存结果，不重复记录新证据。",
                "confidence": 0.5,
                "needsProbe": True,
                "prerequisites": prerequisites,
                "evidenceIds": [existing.evidence_id] if existing.evidence_id else [],
            }
            snapshot["decision"] = self._decision(
                snapshot, topic, prerequisites, snapshot["_private"].get("preferredActionType")
            )
            snapshot["assessmentStatus"] = "saved"
            row.pre_score = score
            self._save(row, snapshot, phase="decision")
            self._db.commit()
            return {
                **self._public(snapshot),
                "alreadyRecorded": True,
                "savedAssessment": {
                    "questionId": spec["id"],
                    "questionVersion": version,
                    "score": score,
                    "evidenceId": existing.evidence_id,
                },
            }
        if row.phase != "diagnostic":
            raise HTTPException(status_code=409, detail="当前会话已完成诊断")
        grade = self._grade(spec, answer, option_id)
        event = self._append_event(
            snapshot,
            kind="diagnostic",
            question_id=spec["id"],
            question_version=version,
            answer=answer,
            score=grade["score"],
            hint_used=False,
            independent=True,
            counts_for_mastery=True,
            misconception_code=topic["misconceptionCode"],
            grading_version=self._grading_version(spec),
            summary=f"规则评分 {grade['score']:.2f}/1.00；{grade['feedback']}",
            duration_seconds=duration_seconds,
            evaluated=True,
        )
        self._project_mastery(event)
        snapshot["state"] = self._sync_state_cache(
            row.learner_id, row.course_id, row.topic_id, create=True
        )
        prerequisites = self._prerequisite_statuses(row.learner_id, topic)
        has_misconception = grade["score"] < 0.75
        snapshot["diagnosis"] = {
            "misconceptionCode": topic["misconceptionCode"] if has_misconception else None,
            "title": topic["misconceptionTitle"] if has_misconception else "当前规则项暂未显示该误解",
            "reason": (
                f"单题规则评分为 {grade['score']:.2f}/1.00。{grade['feedback']} "
                "单题结论属于暂定信号，需用无提示新题再核对。"
            ),
            "confidence": round(min(0.65, 0.38 + 0.07 * len(snapshot["evidence"])), 2),
            "needsProbe": True,
            "prerequisites": prerequisites,
            "evidenceIds": [event["id"]],
        }
        preferred_action = snapshot["_private"].get("preferredActionType")
        if preferred_action == "diagnostic_probe":
            preferred_action = None
        snapshot["decision"] = self._decision(
            snapshot,
            topic,
            prerequisites,
            preferred_action,
        )
        row.pre_score = grade["score"]
        snapshot["assessmentStatus"] = "saved"
        response, _receipt = self._commit_session_submission(
            row=row,
            snapshot=snapshot,
            stage="diagnostic",
            question=spec,
            answer=answer,
            option_id=option_id,
            score=grade["score"],
            feedback=grade["feedback"],
            evidence=event,
            independent=True,
            hint_used=False,
            counts_for_mastery=True,
            misconception_code=topic["misconceptionCode"],
            phase="decision",
        )
        return response

    def intervene(
        self,
        session_id: str,
        learner_id: str,
        action_type: str | None = None,
    ) -> dict:
        row = self._session_record(session_id, learner_id)
        if row.phase not in {"decision", "teaching"}:
            raise HTTPException(status_code=409, detail="请先完成诊断，再进入教学")
        snapshot = deepcopy(row.snapshot)
        topic = TOPICS[row.topic_id]
        chosen = action_type or (snapshot.get("decision") or {}).get("actionType")
        if chosen not in ACTION_TYPES:
            raise HTTPException(status_code=422, detail="actionType 不受支持")
        snapshot["decision"] = self._decision(snapshot, topic, snapshot["diagnosis"]["prerequisites"], chosen)
        snapshot["teaching"] = self._teaching(topic, chosen, snapshot["experimentGroup"])
        if snapshot.get("practiceQuestion") is None:
            self._assign_question(row, snapshot, "practice")
        event = self._append_event(
            snapshot,
            kind="intervention",
            question_id=None,
            question_version=None,
            answer=None,
            score=None,
            hint_used=False,
            independent=False,
            counts_for_mastery=False,
            misconception_code=None,
            grading_version=None,
            summary=f"开始“{snapshot['teaching']['title']}”教学动作。",
        )
        snapshot["_private"]["interventionEvidenceId"] = event["id"]
        snapshot["questionAvailability"] = self._question_availability(
            row.learner_id, row.course_id, topic["knowledgePointId"], snapshot
        )
        self._save(row, snapshot, phase="teaching")
        self._db.commit()
        return self._public(snapshot)

    def practice(
        self,
        session_id: str,
        learner_id: str,
        answer: str,
        option_id: str | None,
        duration_seconds: int,
        hint_used: bool,
    ) -> dict:
        row = self._session_record(session_id, learner_id)
        snapshot = deepcopy(row.snapshot)
        spec = snapshot.get("_private", {}).get("grading", {}).get("practice")
        assignment = snapshot.get("_questionAssignments", {}).get("practice", {})
        if spec is not None:
            spec = dict(spec)
            spec["version"] = assignment.get("version") or spec.get("version") or snapshot.get("catalogVersion") or CATALOG_VERSION
            novelty = assignment.get("novelty", snapshot.get("practiceQuestion", {}).get("novelty", "new"))
            counts_for_mastery = not hint_used and novelty == "new"
            submission_id, answer_hash, version = self._submission_data(
                row, snapshot, "practice", spec, answer, option_id, counts_for_mastery
            )
            existing = self._existing_submission(
                learner_id=learner_id,
                course_id=row.course_id,
                submission_id=submission_id,
                question_id=spec["id"],
                question_version=version,
                answer_hash=answer_hash,
                counts_for_mastery=counts_for_mastery,
                session_id=row.id,
                stage="practice",
            )
            if existing is not None:
                if existing.session_id == row.id:
                    return self._replay_receipt(row, existing)
                return {
                    **self._public(snapshot),
                    "alreadyRecorded": True,
                    "savedAssessment": self._saved_assessment(existing),
                }
        if row.phase != "teaching":
            raise HTTPException(status_code=409, detail="训练题仅在教学阶段开放")
        if spec is None:
            spec = self._assign_question(row, snapshot, "practice")
            if spec is None:
                snapshot["questionAvailability"] = self._question_availability(
                    learner_id, row.course_id, snapshot["knowledgePointId"], snapshot
                )
                return self._public(snapshot)
            assignment = snapshot.get("_questionAssignments", {}).get("practice", {})
            novelty = assignment.get("novelty", "new")
            counts_for_mastery = not hint_used and novelty == "new"
            submission_id, answer_hash, version = self._submission_data(
                row, snapshot, "practice", spec, answer, option_id, counts_for_mastery
            )
            existing = self._existing_submission(
                learner_id=learner_id,
                course_id=row.course_id,
                submission_id=submission_id,
                question_id=spec["id"],
                question_version=version,
                answer_hash=answer_hash,
                counts_for_mastery=counts_for_mastery,
                session_id=row.id,
                stage="practice",
            )
            if existing is not None:
                return self._replay_receipt(row, existing)
        grade = self._grade(spec, answer, option_id)
        topic = TOPICS[row.topic_id]
        misconception_code = spec.get("misconceptionCode") or topic["misconceptionCode"]
        event = self._append_event(
            snapshot,
            kind="practice",
            question_id=spec["id"],
            question_version=version,
            answer=answer,
            score=grade["score"],
            hint_used=hint_used,
            independent=False,
            counts_for_mastery=counts_for_mastery,
            misconception_code=misconception_code,
            grading_version=self._grading_version(spec),
            summary=f"训练规则评分 {grade['score']:.2f}/1.00；{grade['feedback']}",
            duration_seconds=duration_seconds,
            evaluated=counts_for_mastery,
        )
        self._project_mastery(event)
        snapshot["state"] = self._sync_state_cache(
            row.learner_id, row.course_id, row.topic_id, create=True
        )
        snapshot["assessmentStatus"] = "saved"
        snapshot["questionAvailability"] = self._question_availability(
            learner_id, row.course_id, snapshot["knowledgePointId"], snapshot
        )
        response, _receipt = self._commit_session_submission(
            row=row,
            snapshot=snapshot,
            stage="practice",
            question=spec,
            answer=answer,
            option_id=option_id,
            score=grade["score"],
            feedback=grade["feedback"],
            evidence=event,
            independent=False,
            hint_used=hint_used,
            counts_for_mastery=counts_for_mastery,
            misconception_code=misconception_code,
            phase="teaching",
        )
        return response

    def ready_probe(self, session_id: str, learner_id: str) -> dict:
        row = self._session_record(session_id, learner_id)
        if row.phase == "probe" and row.snapshot.get("probeQuestion") is not None:
            return self._public(row.snapshot)
        if row.phase != "teaching":
            raise HTTPException(status_code=409, detail="只有教学阶段可以开始独立验证")
        snapshot = deepcopy(row.snapshot)
        spec = self._assign_question(row, snapshot, "probe")
        snapshot["questionAvailability"] = self._question_availability(
            learner_id, row.course_id, snapshot["knowledgePointId"], snapshot
        )
        self._save(row, snapshot, phase="probe" if spec is not None else "teaching")
        self._db.commit()
        return self._public(snapshot)

    def ready_retest(self, session_id: str, learner_id: str) -> dict:
        row = self._session_record(session_id, learner_id)
        if row.phase != "completed" or row.retest_due_at is None or utc_now() < row.retest_due_at:
            raise HTTPException(status_code=409, detail="延迟复测需在首次独立验证满 7 天后显式准备")
        snapshot = deepcopy(row.snapshot)
        if snapshot.get("retestQuestion") is not None:
            return self._public(snapshot)
        spec = self._assign_question(row, snapshot, "retest")
        snapshot["questionAvailability"] = self._question_availability(
            learner_id, row.course_id, snapshot["knowledgePointId"], snapshot
        )
        self._save(row, snapshot, phase="completed")
        self._db.commit()
        return self._public(snapshot)

    def probe(
        self,
        session_id: str,
        learner_id: str,
        answer: str,
        option_id: str | None,
        duration_seconds: int,
    ) -> dict:
        row = self._session_record(session_id, learner_id)
        snapshot = deepcopy(row.snapshot)
        spec = snapshot.get("_private", {}).get("grading", {}).get("probe")
        if spec is None or snapshot.get("probeQuestion") is None:
            raise HTTPException(status_code=409, detail="请先通过 ready-probe 开始独立验证")
        if row.phase != "probe":
            submission_id, answer_hash, version = self._submission_data(
                row, snapshot, "probe", spec, answer, option_id, True
            )
            existing = self._existing_submission(
                learner_id=learner_id,
                course_id=row.course_id,
                submission_id=submission_id,
                question_id=spec["id"],
                question_version=version,
                answer_hash=answer_hash,
                counts_for_mastery=True,
            )
            if existing is not None:
                if existing.session_id == row.id:
                    return self._replay_receipt(row, existing)
                raise HTTPException(status_code=409, detail="该独立题已在其他会话提交")
            raise HTTPException(status_code=409, detail="当前会话阶段不允许提交独立验证")

        version = self._question_version(spec, self._load_question_bank())
        submission_id, answer_hash, version = self._submission_data(
            row, snapshot, "probe", spec, answer, option_id, True
        )
        existing = self._existing_submission(
            learner_id=learner_id,
            course_id=row.course_id,
            submission_id=submission_id,
            question_id=spec["id"],
            question_version=version,
            answer_hash=answer_hash,
            counts_for_mastery=True,
        )
        if existing is not None:
            if existing.session_id == row.id:
                return self._replay_receipt(row, existing)
            raise HTTPException(status_code=409, detail="该独立题已在其他会话提交")
        grade = self._grade(spec, answer, option_id)
        topic = TOPICS[row.topic_id]
        misconception_code = spec.get("misconceptionCode") or topic["misconceptionCode"]
        feedback = f"规则评分 {grade['score']:.2f}/1.00；{grade['feedback']}"
        event = self._append_event(
            snapshot,
            kind="probe",
            question_id=spec["id"],
            question_version=version,
            answer=answer,
            score=grade["score"],
            hint_used=False,
            independent=True,
            counts_for_mastery=True,
            misconception_code=misconception_code,
            grading_version=self._grading_version(spec),
            summary=feedback,
            duration_seconds=duration_seconds,
            evaluated=True,
        )
        self._project_mastery(event)
        snapshot["state"] = self._sync_state_cache(
            row.learner_id, row.course_id, row.topic_id, create=True
        )
        diagnosis = snapshot["diagnosis"] or {}
        has_misconception = diagnosis.get("misconceptionCode") == misconception_code
        misconception_status = (
            "repaired" if has_misconception and grade["score"] >= 0.75
            else "persisting" if has_misconception and grade["score"] < 0.4
            else "uncertain"
        )
        pre_score = row.pre_score
        now = utc_now()
        retest_due = now + timedelta(days=7)
        outcome_id = str(uuid.uuid4())
        snapshot["outcome"] = {
            "id": outcome_id,
            "interventionId": snapshot["_private"].get("interventionEvidenceId"),
            "questionId": spec["id"],
            "correct": grade["score"] >= 0.75,
            "score": grade["score"],
            "feedback": feedback,
            "independent": True,
            "hintUsed": False,
            "durationSeconds": duration_seconds,
            "preScore": pre_score,
            "postScore": grade["score"],
            "scoreComparable": False,
            "comparisonReason": "前测与独立验证题型或评分标准未校准，保留原始分数，不计算增益。",
            "observedGain": None,
            "misconceptionStatus": misconception_status,
            "retestScore": None,
            "completedAt": _iso(now),
        }
        snapshot["retestDueAt"] = _iso(retest_due)
        snapshot["nextStep"] = self._next_step(
            row.learner_id,
            row.topic_id,
            topic,
            grade["score"],
            misconception_status,
            row.experiment_group,
        )
        row.post_score = grade["score"]
        row.retest_due_at = retest_due
        snapshot["assessmentStatus"] = "saved"
        snapshot["replanning"] = {
            "status": "not_needed",
            "reasonCodes": [],
            "previousPlanId": None,
            "newPlanId": None,
        }
        response, receipt = self._commit_session_submission(
            row=row,
            snapshot=snapshot,
            stage="probe",
            question=spec,
            answer=answer,
            option_id=option_id,
            score=grade["score"],
            feedback=feedback,
            evidence=event,
            independent=True,
            hint_used=False,
            counts_for_mastery=True,
            misconception_code=misconception_code,
            phase="completed",
        )
        if receipt is None:
            return response
        return self._replan_after_assessment(row, receipt)

    def retest(
        self,
        session_id: str,
        learner_id: str,
        answer: str,
        option_id: str | None,
        duration_seconds: int,
    ) -> dict:
        row = self._session_record(session_id, learner_id)
        snapshot = deepcopy(row.snapshot)
        spec = snapshot.get("_private", {}).get("grading", {}).get("retest")
        if spec is None or snapshot.get("retestQuestion") is None:
            raise HTTPException(status_code=409, detail="请先用 ready-retest 显式分配到期复测题")
        version = self._question_version(spec, self._load_question_bank())
        submission_id, answer_hash, version = self._submission_data(
            row, snapshot, "retest", spec, answer, option_id, True
        )
        existing = self._existing_submission(
            learner_id=learner_id,
            course_id=row.course_id,
            submission_id=submission_id,
            question_id=spec["id"],
            question_version=version,
            answer_hash=answer_hash,
            counts_for_mastery=True,
        )
        if existing is not None:
            if existing.session_id == row.id:
                return self._replay_receipt(row, existing)
            raise HTTPException(status_code=409, detail="该复测题已在其他会话提交")
        if row.retest_due_at is None or utc_now() < row.retest_due_at:
            raise HTTPException(status_code=409, detail="延迟复测需在首次独立验证满 7 天后进行")
        if row.retest_score is not None:
            raise HTTPException(status_code=409, detail="本次会话的延迟复测已完成")
        grade = self._grade(spec, answer, option_id)
        feedback = f"延迟复测规则评分 {grade['score']:.2f}/1.00；{grade['feedback']}"
        topic = TOPICS[row.topic_id]
        misconception_code = spec.get("misconceptionCode") or topic["misconceptionCode"]
        event = self._append_event(
            snapshot,
            kind="retest",
            question_id=spec["id"],
            question_version=version,
            answer=answer,
            score=grade["score"],
            hint_used=False,
            independent=True,
            counts_for_mastery=True,
            misconception_code=misconception_code,
            grading_version=self._grading_version(spec),
            summary=feedback,
            duration_seconds=duration_seconds,
            evaluated=True,
        )
        self._project_mastery(event)
        snapshot["state"] = self._sync_state_cache(
            row.learner_id, row.course_id, row.topic_id, create=True
        )
        snapshot["outcome"]["retestScore"] = grade["score"]
        snapshot["outcome"]["feedback"] += f" 延迟复测：{feedback}"
        snapshot["nextStep"] = self._next_step(
            row.learner_id,
            row.topic_id,
            topic,
            grade["score"],
            snapshot["outcome"]["misconceptionStatus"],
            row.experiment_group,
            retest=True,
        )
        row.retest_score = grade["score"]
        snapshot["assessmentStatus"] = "saved"
        response, receipt = self._commit_session_submission(
            row=row,
            snapshot=snapshot,
            stage="retest",
            question=spec,
            answer=answer,
            option_id=option_id,
            score=grade["score"],
            feedback=feedback,
            evidence=event,
            independent=True,
            hint_used=False,
            counts_for_mastery=True,
            misconception_code=misconception_code,
            phase="completed",
        )
        if receipt is None:
            return response
        return self._replan_after_assessment(row, receipt)

    def overview(self, learner_id: str, course_id: str = "course-ds") -> dict:
        sessions = self.list_sessions(learner_id, course_id)
        states = self._states_for_course(learner_id, course_id)
        records = self._db.scalars(
            select(AdaptiveSessionRecord).where(
                AdaptiveSessionRecord.learner_id == learner_id,
                AdaptiveSessionRecord.course_id == course_id,
            )
        ).all()
        outcomes = [session["outcome"] for session in sessions if session.get("outcome")]
        experiments = []
        for group, label in EXPERIMENT_LABELS.items():
            rows = [record for record in records if record.experiment_group == group]
            group_sessions = [session for session in sessions if session["experimentGroup"] == group]
            group_outcomes = [session["outcome"] for session in group_sessions if session.get("outcome")]
            pre = [outcome["preScore"] for outcome in group_outcomes if outcome.get("preScore") is not None]
            post = [outcome["postScore"] for outcome in group_outcomes if outcome.get("postScore") is not None]
            paired_gain = [
                outcome["observedGain"]
                for outcome in group_outcomes
                if outcome.get("scoreComparable") is True
                and outcome.get("observedGain") is not None
            ]
            retention = [outcome["retestScore"] for outcome in group_outcomes if outcome.get("retestScore") is not None]
            experiments.append(
                {
                    "group": group,
                    "label": label,
                    "count": len(rows),
                    "completed": sum(outcome.get("independent") is True for outcome in group_outcomes),
                    "preMean": self._mean(pre),
                    "postMean": self._mean(post),
                    "meanGain": self._mean(paired_gain),
                    "retentionMean": self._mean(retention),
                }
            )
        now = utc_now()
        return {
            "catalogVersion": CATALOG_VERSION,
            "questionBankVersion": self._load_question_bank().get("version"),
            "policyVersion": POLICY_VERSION,
            "sessions": sessions,
            "states": states,
            "stats": {
                "totalSessions": len(sessions),
                "completedSessions": sum(session["outcome"] is not None for session in sessions),
                "independentCorrect": sum(outcome["correct"] for outcome in outcomes),
                "independentTotal": len(outcomes),
                "misconceptionsRepaired": sum(
                    outcome["misconceptionStatus"] == "repaired" for outcome in outcomes
                ),
                "delayedDue": sum(
                    record.retest_due_at is not None
                    and record.retest_due_at <= now
                    and record.retest_score is None
                    for record in records
                ),
            },
            "experiments": experiments,
            "limitations": [
                "课程目录和教学内容状态为待人工审核；本试点未记录人工审核结论。",
                "评分来自题库内明确的规则 rubric，开放文本只匹配已列出的评分要点，不代表人工阅卷。",
                "分组数据只展示实际记录的会话、前测、独立后测和到期复测；样本量不足时均值可能不稳定。",
                "当前记录不是随机对照研究，不能据此宣布因果效果或推广效果。",
                "前测与独立后测的题型或评分标准尚未校准；保留原始分数，不计算归一化增益。",
            ],
        }

    def export_experiments(self, learner_id: str, course_id: str = "course-ds") -> dict:
        overview = self.overview(learner_id, course_id)
        return {
            "version": overview["catalogVersion"],
            "exportedAt": _iso(utc_now()),
            "sessions": overview["sessions"],
            "experiments": overview["experiments"],
        }

    def _session_record(self, session_id: str, learner_id: str | None) -> AdaptiveSessionRecord:
        query = select(AdaptiveSessionRecord).where(AdaptiveSessionRecord.id == session_id)
        if learner_id is not None:
            query = query.where(AdaptiveSessionRecord.learner_id == learner_id)
        row = self._db.scalar(query)
        if row is None:
            raise HTTPException(status_code=404, detail="session not found")
        return row

    def session_scope(self, session_id: str, learner_id: str | None = None) -> dict:
        row = self._session_record(session_id, learner_id)
        return {"learnerId": row.learner_id, "courseId": row.course_id}

    def _append_event(
        self,
        snapshot: dict,
        *,
        kind: str,
        question_id: str | None,
        question_version: str | None,
        answer: str | None,
        score: float | None,
        hint_used: bool,
        independent: bool,
        counts_for_mastery: bool,
        misconception_code: str | None,
        grading_version: str | None,
        summary: str,
        duration_seconds: int | None = None,
        evaluated: bool = False,
    ) -> dict:
        evidence_type = EvidenceType.PRACTICE_ANSWER_EVALUATED if evaluated else EvidenceType.LEARNING_STARTED
        payload = {
            "adaptiveKind": kind,
            "score": score,
            "is_correct": score is not None and score >= 0.75,
            "difficulty": 0.5,
            "grading_source": "server" if evaluated else "behavior",
            "grading_version": grading_version,
            "question_version": question_version or CATALOG_VERSION,
            "independent": independent,
            "hint_used": hint_used,
            "counts_for_mastery": counts_for_mastery,
            "hintUsed": hint_used,
            "summary": summary,
        }
        if misconception_code:
            payload["misconception_code"] = misconception_code
        if duration_seconds is not None:
            payload["durationSeconds"] = duration_seconds
        native = self._evidence.create(
            learner_id=snapshot["learnerId"],
            evidence_type=evidence_type,
            source=EvidenceSource.LEARNING_SPACE,
            knowledge_point_id=snapshot["knowledgePointId"],
            course_id=snapshot["courseId"],
            question_id=question_id,
            session_id=snapshot["id"],
            payload=payload,
        )
        event = {
            "id": native.id,
            "kind": kind,
            "questionId": question_id,
            "questionVersion": question_version or CATALOG_VERSION,
            "answer": answer,
            "score": score,
            "hintUsed": hint_used,
            "independent": independent,
            "countsForMastery": counts_for_mastery,
            "createdAt": _iso(native.occurred_at),
            "summary": summary,
        }
        snapshot["evidence"].append(event)
        return event

    def _project_mastery(self, event: dict) -> None:
        """Project only canonical, mastery-counting evidence into native mastery."""
        if not event.get("countsForMastery"):
            return
        native = self._evidence.get_by_id(event["id"])
        result = self._mastery.project(native)
        if result is not None:
            self._evidence.update_payload(
                event["id"],
                {
                    "mastery_before": result.mastery_before,
                    "mastery_after": result.mastery_after,
                    "confidence": result.confidence,
                    "evidence_count": result.evidence_count,
                },
            )

    def _legacy_leap_version_and_code(self, record: LearningEvidence) -> tuple[str, str | None]:
        if not record.session_id:
            return "legacy-leap", None
        session = self._db.get(AdaptiveSessionRecord, record.session_id)
        if session is None or session.learner_id != record.learner_id or session.course_id != record.course_id:
            return "legacy-leap", None
        topic = TOPICS.get(session.topic_id, {})
        return (
            str(session.snapshot.get("catalogVersion") or "legacy-leap"),
            topic.get("misconceptionCode"),
        )

    def _verified_assessment(self, record: LearningEvidence) -> dict | None:
        try:
            payload = json.loads(record.payload or "{}")
        except (TypeError, json.JSONDecodeError):
            payload = {}

        event_kind = payload.get("adaptiveKind")
        is_legacy_leap = (
            record.evidence_type == EvidenceType.PRACTICE_ANSWER_EVALUATED.value
            and event_kind in {"diagnostic", "probe", "retest"}
            and record.source == EvidenceSource.LEARNING_SPACE.value
            and record.session_id is not None
        )
        is_server_verified = (
            payload.get("grading_source") == "server"
            and payload.get("counts_for_mastery") is True
        )
        is_server_exam = (
            record.evidence_type == EvidenceType.EXAM_ANSWER_EVALUATED.value
            and record.source == EvidenceSource.EXAM_SYSTEM.value
        )
        if not (is_legacy_leap or is_server_verified or is_server_exam):
            return None
        if payload.get("counts_for_mastery") is False or payload.get("hint_used", payload.get("hintUsed", False)):
            return None

        score = payload.get("score")
        if score is None and payload.get("is_correct") is not None:
            score = 1.0 if payload["is_correct"] else 0.0
        if score is None:
            return None
        try:
            score = float(score)
            difficulty = float(payload.get("difficulty", 0.5))
        except (TypeError, ValueError):
            return None
        if not math.isfinite(score) or not math.isfinite(difficulty):
            return None
        score = max(0.0, min(1.0, score))
        difficulty = max(0.0, min(1.0, difficulty))

        legacy_version, legacy_code = self._legacy_leap_version_and_code(record)
        question_version = str(
            payload.get("question_version")
            or ("legacy-exam" if is_server_exam else legacy_version)
        )
        question_id = record.question_id or f"evidence:{record.id}"
        item_key = self._item_key(question_id, question_version)
        misconception_code = (
            payload.get("misconception_code")
            or payload.get("misconceptionCode")
            or (legacy_code if is_legacy_leap else None)
        )
        return {
            "id": record.id,
            "itemKey": item_key,
            "score": score,
            "difficulty": difficulty,
            "misconceptionCode": misconception_code,
            "stage": event_kind or "external_assessment",
            "independent": bool(payload.get("independent", is_legacy_leap or is_server_exam)),
        }

    @staticmethod
    def _apply_bkt(
        mastery: float,
        score: float,
        *,
        misconception_items: list[dict],
        misconception_code: str | None,
        stage: str,
    ) -> float:
        slip, guess, transition = 0.1, 0.2, 0.08
        likelihood_mastered = score * (1 - slip) + (1 - score) * slip
        likelihood_unmastered = score * guess + (1 - score) * (1 - guess)
        denominator = mastery * likelihood_mastered + (1 - mastery) * likelihood_unmastered
        posterior = (mastery * likelihood_mastered / denominator) if denominator else mastery
        updated = min(1.0, posterior + (1 - posterior) * transition)
        if misconception_code:
            current = next(
                (item for item in misconception_items if item["code"] == misconception_code),
                None,
            )
            prior_probability = current["probability"] if current else 0.05
            proposed = (
                prior_probability + 0.45 * (1 - score)
                if stage == "diagnostic"
                else prior_probability * (0.5 if score >= 0.75 else 1.1)
            )
            entry = {
                "code": misconception_code,
                "probability": round(min(0.95, max(0.02, proposed)), 4),
            }
            if current:
                misconception_items[misconception_items.index(current)] = entry
            elif stage == "diagnostic" or score < 0.75:
                misconception_items.append(entry)
        return updated

    def _derive_state(
        self,
        learner_id: str,
        course_id: str,
        knowledge_point_id: str,
        name: str,
    ) -> dict:
        records = self._db.scalars(
            select(LearningEvidence)
            .where(
                LearningEvidence.learner_id == learner_id,
                LearningEvidence.course_id == course_id,
                LearningEvidence.knowledge_point_id == knowledge_point_id,
            )
            .order_by(LearningEvidence.occurred_at.asc(), LearningEvidence.id.asc())
        ).all()
        seen_items: set[str] = set()
        count = 0
        mastery: float | None = None
        misconceptions: list[dict] = []
        for record in records:
            assessment = self._verified_assessment(record)
            if assessment is None or assessment["itemKey"] in seen_items:
                continue
            seen_items.add(assessment["itemKey"])
            prior = mastery if mastery is not None else 0.5
            mastery = self._apply_bkt(
                prior,
                assessment["score"],
                misconception_items=misconceptions,
                misconception_code=assessment["misconceptionCode"],
                stage=assessment["stage"],
            )
            count += 1
        return {
            "knowledgePointId": knowledge_point_id,
            "name": name,
            "mastery": None if count == 0 else round(mastery, 4),
            "uncertainty": round(1 / math.sqrt(count + 1), 4),
            "evidenceCount": count,
            "misconceptions": misconceptions,
            "modelVersion": MODEL_VERSION,
        }

    def _sync_state_cache(
        self,
        learner_id: str,
        course_id: str,
        topic_id: str,
        *,
        create: bool,
    ) -> dict:
        topic = TOPICS[topic_id]
        state = self._derive_state(
            learner_id, course_id, topic["knowledgePointId"], topic["name"]
        )
        record = self._db.scalar(
            select(AdaptiveKnowledgeState).where(
                AdaptiveKnowledgeState.learner_id == learner_id,
                AdaptiveKnowledgeState.knowledge_point_id == topic["knowledgePointId"],
            )
        )
        if record is None and create:
            record = AdaptiveKnowledgeState(
                id=str(uuid.uuid4()),
                learner_id=learner_id,
                knowledge_point_id=topic["knowledgePointId"],
                name=topic["name"],
                mastery=state["mastery"],
                uncertainty=state["uncertainty"],
                evidence_count=state["evidenceCount"],
                misconceptions=state["misconceptions"],
                model_version=MODEL_VERSION,
            )
            self._db.add(record)
        elif record is not None:
            record.name = state["name"]
            record.mastery = state["mastery"]
            record.uncertainty = state["uncertainty"]
            record.evidence_count = state["evidenceCount"]
            record.misconceptions = state["misconceptions"]
            record.model_version = MODEL_VERSION
            record.updated_at = utc_now()
        self._db.flush()
        return state

    def _prerequisite_statuses(self, learner_id: str, topic: dict) -> list[dict]:
        statuses = []
        for prerequisite in topic["prerequisites"]:
            state = self._derive_state(
                learner_id, "course-ds", prerequisite["id"], prerequisite["name"]
            )
            if state["evidenceCount"] > 0:
                status = "supported" if (state["mastery"] or 0.0) >= 0.65 else "gap"
            else:
                status = "unknown"
            statuses.append({**prerequisite, "status": status})
        return statuses

    def _decision(
        self,
        snapshot: dict,
        topic: dict,
        prerequisites: list[dict],
        selected_override: str | None = None,
    ) -> dict:
        diagnosis = snapshot.get("diagnosis") or {}
        group = snapshot["experimentGroup"]
        ablation = snapshot["ablation"]
        active_misconception = (
            group == "D"
            and ablation != "misconception"
            and diagnosis.get("misconceptionCode") is not None
        )
        has_gap = any(item["status"] == "gap" for item in prerequisites)
        if ablation == "prerequisites":
            has_gap = False
        budget = snapshot.get("_timeBudgetMinutes", 25)
        state = snapshot["state"]
        evidence_count = state["evidenceCount"]
        mastery = state["mastery"]
        has_evidence = evidence_count > 0
        preference_scores = {
            "diagnostic_probe": 0.35,
            "contrastive_teaching": 0.3,
            "prerequisite_repair": 0.25,
            "guided_practice": 0.55,
            "transfer_challenge": 0.45,
            "retrieval_practice": 0.4,
        }
        if has_gap:
            preference_scores = {
                "diagnostic_probe": 0.25,
                "contrastive_teaching": 0.4,
                "prerequisite_repair": 1.0,
                "guided_practice": 0.42,
                "transfer_challenge": 0.25,
                "retrieval_practice": 0.3,
            }
        elif active_misconception:
            preference_scores = {
                "diagnostic_probe": 0.45,
                "contrastive_teaching": 1.0,
                "prerequisite_repair": 0.2,
                "guided_practice": 0.65,
                "transfer_challenge": 0.3,
                "retrieval_practice": 0.35,
            }
        elif group == "C":
            if not has_evidence or mastery is None:
                preference_scores["diagnostic_probe"] = 1.0
                preference_scores["guided_practice"] = 0.65
            elif mastery < 0.4:
                preference_scores["guided_practice"] = 0.95
                preference_scores["retrieval_practice"] = 0.6
            elif mastery >= 0.75:
                preference_scores["transfer_challenge"] = 0.9
                preference_scores["retrieval_practice"] = 0.72
            else:
                preference_scores["retrieval_practice"] = 0.85
                preference_scores["guided_practice"] = 0.65
        elif not has_evidence or mastery is None:
            preference_scores["diagnostic_probe"] = 1.0
            preference_scores["guided_practice"] = 0.65
        elif mastery < 0.4:
            preference_scores["guided_practice"] = 0.85
            preference_scores["retrieval_practice"] = 0.6
        elif mastery >= 0.75:
            preference_scores["transfer_challenge"] = 0.85
            preference_scores["retrieval_practice"] = 0.72
        else:
            preference_scores["retrieval_practice"] = 0.8
            preference_scores["guided_practice"] = 0.65

        information_base = {
            "diagnostic_probe": 0.9,
            "contrastive_teaching": 0.55,
            "prerequisite_repair": 0.6,
            "guided_practice": 0.65,
            "transfer_challenge": 0.8,
            "retrieval_practice": 0.5,
        }
        misconception_preferences = {
            "contrastive_teaching": 1.0,
            "guided_practice": 0.65,
            "diagnostic_probe": 0.45,
            "transfer_challenge": 0.3,
            "prerequisite_repair": 0.2,
            "retrieval_practice": 0.35,
        }
        candidates = []
        for action_type in ACTION_TYPES:
            label, minutes, _ = ACTION_META[action_type]
            misconception = misconception_preferences[action_type] if active_misconception else 0.0
            prerequisite = 1.0 if has_gap and action_type == "prerequisite_repair" else 0.0
            information = information_base[action_type] if not has_evidence else 0.25
            time_fit = 1.0 if minutes <= budget else round(max(0.0, budget / minutes), 3)
            cost = round(minutes / 30, 3)
            factors = {
                "misconception": misconception,
                "prerequisite": prerequisite,
                "information": information,
                "time": time_fit,
                "cost": cost,
            }
            preference = preference_scores[action_type]
            if group in {"A", "B"}:
                fixed = "guided_practice" if group == "A" else topic["fixedAction"]
                preference = 1.0 if action_type == fixed else 0.35
            score = round(max(0.0, min(1.0, preference + 0.04 * time_fit - 0.08 * cost)), 4)
            reasons = []
            if active_misconception:
                reasons.append(f"已知误解策略偏好 {misconception:.2f}")
            if factors["prerequisite"]:
                reasons.append("存在有记录的前置知识 gap")
            if not has_evidence and action_type == "diagnostic_probe":
                reasons.append("缺少该知识点的有效证据，优先补充诊断信息")
            reasons.append(f"预计 {minutes} 分钟，时间匹配 {time_fit:.2f}，成本因子 {cost:.2f}")
            candidates.append(
                {
                    "actionType": action_type,
                    "label": label,
                    "score": score,
                    "reason": "；".join(reasons),
                    "factors": factors,
                }
            )
        candidates.sort(key=lambda item: (-item["score"], item["actionType"]))
        fixed_action = topic["fixedAction"]
        if selected_override is not None:
            chosen = selected_override
            selection_reason = "承接上一步的明确教学动作建议。"
        elif group == "A":
            chosen = "guided_practice"
            selection_reason = "A 组执行固定的通用引导讲解路径。"
        elif group == "B":
            chosen = fixed_action
            selection_reason = f"B 组执行课程定型动作“{ACTION_META[chosen][0]}”。"
        elif group == "C":
            chosen = max(candidates, key=lambda item: (item["score"], item["actionType"]))["actionType"]
            selection_reason = "C 组只根据已记录证据、掌握估计和有记录的前置 gap 动态选择；不匹配误解代码。"
        elif ablation == "ranking":
            chosen = fixed_action
            selection_reason = f"ranking ablation 关闭 LEAP 排序，回退课程固定动作“{ACTION_META[chosen][0]}”。"
        else:
            chosen = candidates[0]["actionType"]
            selection_reason = "D 组 LEAP 按误解、前置状态、掌握证据、时间匹配与正向成本因子排序。"
        previous_recommendation = snapshot["_private"].get("preferredActionType")
        if previous_recommendation:
            selection_reason += f" 上一会话建议动作 {previous_recommendation} 已保留并纳入本次理由。"
        selected = next(item for item in candidates if item["actionType"] == chosen)
        title_by_topic = {
            "linked-list": (
                "先修复单链表复杂度误区"
                if diagnosis.get("misconceptionCode") == topic["misconceptionCode"]
                else "区分单链表插入的定位与指针修改"
            ),
            "stack-queue": "先区分栈与队列的出入顺序",
            "bst": "用反例理解二叉搜索树的平衡",
            "graph-search": "比较 BFS 与 DFS 的选择条件",
            "sorting-search": "先核对查找前提，再区分排序性质与复杂度",
        }
        return {
            "actionType": chosen,
            "label": selected["label"],
            "title": title_by_topic[topic["id"]],
            "reason": f"{selection_reason} {selected['reason']}",
            "estimatedMinutes": ACTION_META[chosen][1],
            "policyVersion": POLICY_VERSION,
            "evidenceIds": list(diagnosis.get("evidenceIds", [])),
            "candidates": candidates,
        }

    @staticmethod
    def _teaching(topic: dict, action_type: str, experiment_group: str = "D") -> dict:
        if experiment_group == "A":
            panels = [
                {"label": "通用讲解", "title": "核心规则", "body": topic["concept"]},
                {"label": "通用示例", "title": "按步骤推演", "body": topic["example"]},
            ]
            introduction = "A 组采用固定的通用讲解路径；先读规则，再照示例逐步推演。"
            reflection = "你能否先说出规则，再用它解释示例？"
            steps = ["阅读核心规则", "逐步追踪示例", "用自己的话复述结论"]
        elif topic["id"] == "linked-list" and action_type == "contrastive_teaching":
            panels = [
                {
                    "label": "情形 A",
                    "title": "已知前驱节点",
                    "complexity": "O(1)",
                    "body": "已拿到插入位置的前驱 p，只需创建新节点并改动有限条指针；不需要遍历链表。",
                    "steps": ["设置新节点的 next 指向 p 原来的后继", "再把 p.next 改为新节点"],
                },
                {
                    "label": "情形 B",
                    "title": "需要先定位",
                    "complexity": "O(n)",
                    "body": "只给头指针和目标位置时，必须从头沿 next 查找前驱；最坏要访问线性数量节点，定位完成后改指针仍为 O(1)。",
                    "steps": ["从头结点开始遍历寻找前驱", "最坏定位 O(n)", "找到前驱后改指针 O(1)"],
                },
            ]
            introduction = "先确认题目是否已经给出前驱节点；定位和改指针是两段不同成本。"
            reflection = "题目给的是前驱 p，还是只给头指针与位置？这项条件怎样改变总复杂度？"
            steps = ["判断输入是否已包含前驱节点", "分别计算定位成本与指针修改成本", "用占主导的步骤写出总复杂度"]
        elif action_type == "contrastive_teaching":
            panels = [
                {"label": "常见误解", "title": topic["misconceptionTitle"], "body": topic["misconception"]},
                {"label": "正确规则", "title": "用操作成本拆开看", "body": topic["contrast"]},
                {"label": "例子", "title": "把规则放进具体操作", "body": topic["example"]},
            ]
            introduction = f"先对照“{topic['misconceptionTitle']}”与实际规则，再用操作过程验证。"
            reflection = "你现在会先检查操作前提，还是只看结构名称？"
            steps = ["说出题目要执行的操作", "分别计算定位与操作本身的成本", "用例子核对复杂度结论"]
        elif action_type == "prerequisite_repair":
            panels = [
                {"label": "前置知识", "title": topic["prerequisites"][0]["name"], "body": f"先确认“{topic['prerequisites'][0]['name']}”中每个对象如何表示、访问和记录。"},
                {"label": "当前规则", "title": topic["name"], "body": topic["concept"]},
                {"label": "回到问题", "title": "分离前置与当前成本", "body": topic["example"]},
            ]
            introduction = "先补上当前推理要用到的结构基础，再回到本题。"
            reflection = "哪一条前置规则帮助你得出当前结论？"
            steps = ["复述前置概念", "指出它在当前操作中的作用", "重新计算当前问题的结果"]
        elif action_type == "guided_practice":
            panels = [
                {"label": "规则", "title": topic["name"], "body": topic["concept"]},
                {"label": "示范", "title": "按步骤追踪", "body": topic["example"]},
                {"label": "自检", "title": "检查边界条件", "body": topic["contrast"]},
            ]
            introduction = "跟着示范把输入、结构变化和操作成本逐步写出来。"
            reflection = "哪一步最容易让操作本身和查找成本混在一起？"
            steps = ["确定初始数据或结构", "按规则逐步执行", "记录每一步访问或移动", "写出结论与理由"]
        elif action_type == "transfer_challenge":
            panels = [
                {"label": "核心规则", "title": "抓住不变条件", "body": topic["concept"]},
                {"label": "迁移情境", "title": "换一个输入顺序", "body": topic["example"]},
                {"label": "比较", "title": "解释结果为何变化", "body": topic["contrast"]},
            ]
            introduction = "把规则迁移到不同输入或数据规模，说明结论何时变化。"
            reflection = "改变了哪些输入条件，核心规则仍然成立吗？"
            steps = ["识别新场景改变的条件", "沿结构规则推演", "检查最坏情况", "解释结论适用范围"]
        elif action_type == "retrieval_practice":
            panels = [
                {"label": "先回忆", "title": "不看答案说规则", "body": topic["concept"]},
                {"label": "再应用", "title": "套用到一个操作", "body": topic["example"]},
            ]
            introduction = "先凭记忆说出关键规则，再用一个短场景自检。"
            reflection = "不看讲解时，你能否说明规则成立的前提？"
            steps = ["闭上讲解先回忆定义", "用一句话说出关键顺序或成本", "对照新例子检查遗漏", "记录仍不确定的一点"]
        else:
            panels = [
                {"label": "探查", "title": "先形成判断", "body": topic["concept"]},
                {"label": "核对", "title": "解释理由", "body": topic["example"]},
            ]
            introduction = "先用聚焦问题确认当前规则，再根据依据继续学习。"
            reflection = "你的判断依据来自题目中的哪项信息？"
            steps = ["指出关键条件", "提出暂定结论", "说明可以验证结论的证据"]
        return {
            "actionType": action_type,
            "title": f"{ACTION_META[action_type][0]}：{topic['name']}",
            "introduction": introduction,
            "panels": panels,
            "reflectionPrompt": reflection,
            "steps": steps,
        }

    def _grade(self, spec: dict, answer: str, option_id: str | None) -> dict:
        if spec.get("correctOptionId") is not None:
            selected = option_id or next(
                (
                    option["id"]
                    for option in spec.get("options", [])
                    if option.get("text", option.get("label", "")).strip() == answer.strip()
                ),
                None,
            )
            score = 1.0 if selected == spec["correctOptionId"] else 0.0
            explanation = spec.get("explanation", spec.get("rubric", ""))
            return {
                "score": score,
                "feedback": explanation if score else f"未满足评分要点：{explanation}",
            }
        normalized = re.sub(r"已(?:经)?(?:知道|给出|持有)", "已知", answer.casefold())
        groups = spec.get("rubricGroups", [])
        matched = 0
        for group in groups:
            all_terms = group.get("all", [])
            any_terms = group.get("any", [])
            all_present = all(self._contains_term(normalized, term) for term in all_terms)
            any_present = not any_terms or any(self._contains_term(normalized, term) for term in any_terms)
            matched += all_present and any_present
        if groups and matched == len(groups):
            score = 1.0
        elif groups and matched > 0:
            score = round(0.74 * matched / len(groups), 4)
        else:
            score = 0.0
        feedback = (
            f"{spec['rubric']} 满足 {matched}/{len(groups)} 项必需条件；"
            "只有全部必需条件满足才记为完整正确，此为规则匹配评分。"
        )
        return {"score": score, "feedback": feedback}

    @staticmethod
    def _contains_term(answer: str, term: str) -> bool:
        normalized = term.casefold()
        if re.fullmatch(r"[a-z0-9]+(?:\([a-z0-9]+\))?", normalized):
            pattern = rf"(?<![a-z0-9]){re.escape(normalized)}(?![a-z0-9])"
            return re.search(pattern, answer) is not None
        return normalized in answer

    def _next_step(
        self,
        learner_id: str,
        topic_id: str,
        topic: dict,
        score: float,
        misconception_status: str,
        experiment_group: str,
        *,
        retest: bool = False,
    ) -> dict | None:
        topic_order = list(TOPICS)
        target_topic_id = topic_id
        reason_prefix = "本次独立验证"
        if score >= 0.75:
            index = topic_order.index(topic_id)
            if index + 1 < len(topic_order):
                target_topic_id = topic_order[index + 1]
                reason_prefix = "7 天延迟复测" if retest else "无提示新题"
            elif retest:
                return None
        target_topic = TOPICS[target_topic_id]
        state = self._derive_state(
            learner_id,
            "course-ds",
            target_topic["knowledgePointId"],
            target_topic["name"],
        )
        has_prior_evidence = state["evidenceCount"] > 0
        if not has_prior_evidence:
            return {
                "title": f"先诊断：{target_topic['name']}",
                "reason": f"{reason_prefix}达到当前规则阈值；新知识点需要自己的基线题，之后再按证据选择教学动作。",
                "actionType": "diagnostic_probe",
                "topicId": target_topic_id,
            }
        if experiment_group == "A":
            action = "guided_practice"
            reason = "A 组沿用固定通用讲解路径。"
        elif experiment_group == "B":
            action = target_topic["fixedAction"]
            reason = "B 组沿用目标知识点的课程固定动作。"
        elif experiment_group == "C":
            mastery = state["mastery"] or 0.0
            action = "guided_practice" if mastery < 0.4 else "transfer_challenge" if mastery >= 0.75 else "retrieval_practice"
            reason = "C 组仅根据目标知识点的掌握证据选择后续练习，不匹配误解代码。"
        elif misconception_status == "persisting":
            action = "prerequisite_repair"
            reason = "当前主题的独立题仍显示误解，先回到前置/规则基础。"
        elif score >= 0.75:
            target_mastery = state["mastery"] or 0.0
            action = "transfer_challenge" if target_mastery >= 0.75 else "retrieval_practice"
            reason = f"{reason_prefix}达到当前规则阈值，继续做迁移或提取练习并保留七天复测。"
        else:
            action = "contrastive_teaching"
            reason = "新题规则评分不足，回到两种操作情形的对比讲解。"
        return {
            "title": f"继续：{target_topic['name']}",
            "reason": reason,
            "actionType": action,
            "topicId": target_topic_id,
        }

    def _states_for_course(self, learner_id: str, course_id: str) -> list[dict]:
        if course_id != "course-ds":
            return []
        states = [
            self._derive_state(learner_id, course_id, topic["knowledgePointId"], topic["name"])
            for topic in TOPICS.values()
        ]
        return [state for state in states if state["evidenceCount"] > 0]

    @staticmethod
    def _mean(values: list[float]) -> float | None:
        return round(sum(values) / len(values), 4) if values else None

    @staticmethod
    def _save(
        row: AdaptiveSessionRecord,
        snapshot: dict,
        *,
        phase: str | None = None,
    ) -> None:
        now = utc_now()
        snapshot["updatedAt"] = _iso(now)
        row.snapshot = snapshot
        row.phase = phase or snapshot["phase"]
        snapshot["phase"] = row.phase
        row.updated_at = now

    def _public(self, snapshot: dict) -> dict:
        keys = (
            "id",
            "learnerId",
            "courseId",
            "topicId",
            "topicName",
            "knowledgePointId",
            "policy",
            "experimentGroup",
            "ablation",
            "catalogVersion",
            "policyVersion",
            "phase",
            "createdAt",
            "updatedAt",
            "diagnosticQuestion",
            "practiceQuestion",
            "probeQuestion",
            "retestQuestion",
            "diagnosis",
            "decision",
            "teaching",
            "outcome",
            "state",
            "evidence",
            "nextStep",
            "retestDueAt",
        )
        payload = {key: snapshot.get(key) for key in keys}
        payload["state"] = self._derive_state(
            snapshot["learnerId"],
            snapshot["courseId"],
            snapshot["knowledgePointId"],
            snapshot["topicName"],
        )
        payload["assessmentStatus"] = snapshot.get(
            "assessmentStatus",
            "saved" if snapshot.get("outcome") is not None else "pending",
        )
        payload["replanning"] = snapshot.get(
            "replanning",
            {
                "status": "not_needed",
                "reasonCodes": [],
                "previousPlanId": None,
                "newPlanId": None,
            },
        )
        payload["questionAvailability"] = self._question_availability(
            snapshot["learnerId"],
            snapshot["courseId"],
            snapshot["knowledgePointId"],
            snapshot,
        )
        outcome = payload.get("outcome")
        if outcome is not None:
            outcome = dict(outcome)
            if outcome.get("scoreComparable") is not True:
                outcome["scoreComparable"] = False
                outcome["comparisonReason"] = outcome.get("comparisonReason") or (
                    "前后题型或评分标准未校准，保留原始分数，不计算增益。"
                )
                outcome["observedGain"] = None
            payload["outcome"] = outcome
        return payload
