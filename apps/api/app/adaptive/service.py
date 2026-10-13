from __future__ import annotations

import math
import re
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adaptive.catalog import (
    ACTION_META,
    ACTION_TYPES,
    CATALOG_VERSION,
    MODEL_VERSION,
    POLICY_VERSION,
    QUESTION_BANKS,
    TOPICS,
    catalog_payload,
    public_question,
)
from app.adaptive.models import AdaptiveKnowledgeState, AdaptiveSessionRecord
from app.core.time import utc_now
from app.domain import (
    EvidenceSource,
    EvidenceType,
    LearningEvidence,
    MasteryRecord,
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
        knowledge_state = self._knowledge_record(
            learner_id=learner_id,
            topic_id=topic_id,
            create=True,
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
            "state": self._knowledge_payload(knowledge_state),
            "evidence": [],
            "nextStep": None,
            "retestDueAt": None,
            "_private": {
                "grading": {"diagnostic": diagnostic},
                "interventionEvidenceId": None,
                "preferredActionType": preferred_action,
                "recommendationReason": recommendation_reason,
            },
            "_timeBudgetMinutes": max(3, int(time_budget_minutes)),
        }
        if continue_same_topic and knowledge_state.evidence_count > 0:
            topic_prerequisites = self._prerequisite_statuses(learner_id, topic)
            misconception = max(
                knowledge_state.misconceptions or [],
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
                "confidence": round(min(0.85, 0.35 + 0.06 * knowledge_state.evidence_count), 2),
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
        return [self._public(self._refresh_retest_question(row)) for row in rows]

    def get_session(
        self,
        session_id: str,
        learner_id: str | None = None,
        course_id: str | None = None,
    ) -> dict:
        row = self._session_record(session_id, learner_id)
        if course_id is not None and row.course_id != course_id:
            raise HTTPException(status_code=404, detail="session not found")
        return self._public(self._refresh_retest_question(row))

    def diagnose(
        self,
        session_id: str,
        learner_id: str,
        answer: str,
        option_id: str | None,
        duration_seconds: int,
    ) -> dict:
        row = self._session_record(session_id, learner_id)
        if row.phase != "diagnostic":
            raise HTTPException(status_code=409, detail="当前会话已完成诊断")
        snapshot = dict(row.snapshot)
        topic = TOPICS[row.topic_id]
        spec = snapshot["_private"]["grading"]["diagnostic"]
        grade = self._grade(spec, answer, option_id)
        event = self._append_event(
            snapshot,
            kind="diagnostic",
            question_id=spec["id"],
            answer=answer,
            score=grade["score"],
            hint_used=False,
            summary=f"规则评分 {grade['score']:.2f}/1.00；{grade['feedback']}",
            duration_seconds=duration_seconds,
            evaluated=True,
        )
        self._project_mastery(event)
        knowledge = self._knowledge_record(row.learner_id, row.topic_id, create=True)
        self._update_bkt(knowledge, grade["score"], topic["misconceptionCode"], stage="diagnostic")
        snapshot["state"] = self._knowledge_payload(knowledge)
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
        self._save(row, snapshot, phase="decision")
        self._db.commit()
        return self._public(snapshot)

    def intervene(
        self,
        session_id: str,
        learner_id: str,
        action_type: str | None = None,
    ) -> dict:
        row = self._session_record(session_id, learner_id)
        if row.phase not in {"decision", "teaching"}:
            raise HTTPException(status_code=409, detail="请先完成诊断，再进入教学")
        snapshot = dict(row.snapshot)
        topic = TOPICS[row.topic_id]
        chosen = action_type or (snapshot.get("decision") or {}).get("actionType")
        if chosen not in ACTION_TYPES:
            raise HTTPException(status_code=422, detail="actionType 不受支持")
        snapshot["decision"] = self._decision(snapshot, topic, snapshot["diagnosis"]["prerequisites"], chosen)
        snapshot["teaching"] = self._teaching(topic, chosen, snapshot["experimentGroup"])
        if snapshot.get("practiceQuestion") is None:
            practice_spec = self._choose_unused_question(row, snapshot, "practice")
            snapshot["practiceQuestion"] = public_question(practice_spec)
            snapshot["_private"]["grading"]["practice"] = practice_spec
        event = self._append_event(
            snapshot,
            kind="intervention",
            question_id=None,
            answer=None,
            score=None,
            hint_used=False,
            summary=f"开始“{snapshot['teaching']['title']}”教学动作。",
        )
        snapshot["_private"]["interventionEvidenceId"] = event["id"]
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
        if row.phase != "teaching":
            raise HTTPException(status_code=409, detail="训练题仅在教学阶段开放")
        snapshot = dict(row.snapshot)
        if snapshot.get("practiceQuestion") is None:
            spec = self._choose_unused_question(row, snapshot, "practice")
            snapshot["practiceQuestion"] = public_question(spec)
            snapshot["_private"]["grading"]["practice"] = spec
        spec = snapshot["_private"]["grading"]["practice"]
        grade = self._grade(spec, answer, option_id)
        event = self._append_event(
            snapshot,
            kind="practice",
            question_id=spec["id"],
            answer=answer,
            score=grade["score"],
            hint_used=hint_used,
            summary=f"训练规则评分 {grade['score']:.2f}/1.00；{grade['feedback']}",
            duration_seconds=duration_seconds,
        )
        if not hint_used:
            topic = TOPICS[row.topic_id]
            knowledge = self._knowledge_record(row.learner_id, row.topic_id, create=True)
            self._update_bkt(knowledge, grade["score"], topic["misconceptionCode"], stage="practice")
            snapshot["state"] = self._knowledge_payload(knowledge)
        self._save(row, snapshot, phase="teaching")
        self._db.commit()
        return self._public(snapshot)

    def ready_probe(self, session_id: str, learner_id: str) -> dict:
        row = self._session_record(session_id, learner_id)
        if row.phase != "teaching":
            raise HTTPException(status_code=409, detail="只有教学阶段可以开始独立验证")
        snapshot = dict(row.snapshot)
        spec = self._choose_unused_question(row, snapshot, "probe")
        snapshot["probeQuestion"] = public_question(spec)
        snapshot["_private"]["grading"]["probe"] = spec
        self._save(row, snapshot, phase="probe")
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
        if row.phase != "probe" or row.snapshot.get("probeQuestion") is None:
            raise HTTPException(status_code=409, detail="请先通过 ready-probe 开始独立验证")
        snapshot = dict(row.snapshot)
        spec = snapshot["_private"]["grading"]["probe"]
        grade = self._grade(spec, answer, option_id)
        topic = TOPICS[row.topic_id]
        feedback = f"规则评分 {grade['score']:.2f}/1.00；{grade['feedback']}"
        event = self._append_event(
            snapshot,
            kind="probe",
            question_id=spec["id"],
            answer=answer,
            score=grade["score"],
            hint_used=False,
            summary=feedback,
            duration_seconds=duration_seconds,
            evaluated=True,
        )
        self._project_mastery(event)
        knowledge = self._knowledge_record(row.learner_id, row.topic_id, create=True)
        self._update_bkt(knowledge, grade["score"], topic["misconceptionCode"], stage="probe")
        snapshot["state"] = self._knowledge_payload(knowledge)
        diagnosis = snapshot["diagnosis"] or {}
        has_misconception = diagnosis.get("misconceptionCode") == topic["misconceptionCode"]
        misconception_status = (
            "repaired" if has_misconception and grade["score"] >= 0.75
            else "persisting" if has_misconception and grade["score"] < 0.4
            else "uncertain"
        )
        if row.pre_score is None:
            raise HTTPException(status_code=409, detail="独立后测缺少真实前测分，不能计算增益")
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
            "observedGain": round(grade["score"] - pre_score, 4),
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
        self._save(row, snapshot, phase="completed")
        self._db.commit()

        replanning = DynamicReplanningService(self._db).replan(row.learner_id, row.course_id)
        if replanning.performed and snapshot.get("nextStep") is not None:
            snapshot["nextStep"]["reason"] += " 本次证据已触发现有 course-ds 学习计划重排。"
            self._save(row, snapshot, phase="completed")
            self._db.commit()
        return self._public(snapshot)

    def retest(
        self,
        session_id: str,
        learner_id: str,
        answer: str,
        option_id: str | None,
        duration_seconds: int,
    ) -> dict:
        row = self._session_record(session_id, learner_id)
        if row.retest_due_at is None or utc_now() < row.retest_due_at:
            raise HTTPException(status_code=409, detail="延迟复测需在首次独立验证满 7 天后进行")
        if row.retest_score is not None:
            raise HTTPException(status_code=409, detail="本次会话的延迟复测已完成")
        snapshot = dict(row.snapshot)
        if snapshot.get("retestQuestion") is None:
            spec = self._choose_unused_question(row, snapshot, "retest")
            snapshot["retestQuestion"] = public_question(spec)
            snapshot["_private"]["grading"]["retest"] = spec
        spec = snapshot["_private"]["grading"]["retest"]
        grade = self._grade(spec, answer, option_id)
        feedback = f"延迟复测规则评分 {grade['score']:.2f}/1.00；{grade['feedback']}"
        event = self._append_event(
            snapshot,
            kind="retest",
            question_id=spec["id"],
            answer=answer,
            score=grade["score"],
            hint_used=False,
            summary=feedback,
            duration_seconds=duration_seconds,
            evaluated=True,
        )
        self._project_mastery(event)
        topic = TOPICS[row.topic_id]
        knowledge = self._knowledge_record(row.learner_id, row.topic_id, create=True)
        self._update_bkt(knowledge, grade["score"], topic["misconceptionCode"], stage="retest")
        snapshot["state"] = self._knowledge_payload(knowledge)
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
        self._save(row, snapshot, phase="completed")
        self._db.commit()
        replanning = DynamicReplanningService(self._db).replan(row.learner_id, row.course_id)
        if replanning.performed and snapshot.get("nextStep") is not None:
            snapshot["nextStep"]["reason"] += " 延迟复测证据已触发现有 course-ds 学习计划重排。"
            self._save(row, snapshot, phase="completed")
            self._db.commit()
        return self._public(snapshot)

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
            pre = [record.pre_score for record in rows if record.pre_score is not None]
            post = [record.post_score for record in rows if record.post_score is not None]
            paired_gain = [
                record.post_score - record.pre_score
                for record in rows
                if record.post_score is not None and record.pre_score is not None
            ]
            retention = [record.retest_score for record in rows if record.retest_score is not None]
            experiments.append(
                {
                    "group": group,
                    "label": label,
                    "count": len(rows),
                    "completed": sum(record.post_score is not None for record in rows),
                    "preMean": self._mean(pre),
                    "postMean": self._mean(post),
                    "meanGain": self._mean(paired_gain),
                    "retentionMean": self._mean(retention),
                }
            )
        now = utc_now()
        return {
            "catalogVersion": CATALOG_VERSION,
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

    def _refresh_retest_question(self, row: AdaptiveSessionRecord) -> dict:
        snapshot = dict(row.snapshot)
        if (
            row.retest_due_at is not None
            and row.retest_due_at <= utc_now()
            and row.retest_score is None
            and snapshot.get("retestQuestion") is None
        ):
            spec = self._choose_unused_question(row, snapshot, "retest")
            snapshot["retestQuestion"] = public_question(spec)
            snapshot["_private"]["grading"]["retest"] = spec
            self._save(row, snapshot)
            self._db.commit()
        return snapshot

    def _choose_unused_question(
        self,
        row: AdaptiveSessionRecord,
        snapshot: dict,
        stage: str,
    ) -> dict:
        used = self._used_question_ids(row.learner_id, row.topic_id)
        for key in ("diagnosticQuestion", "practiceQuestion", "probeQuestion", "retestQuestion"):
            current = snapshot.get(key)
            if current is not None:
                used.add(current["id"])
        for spec in QUESTION_BANKS[row.topic_id][stage]:
            if spec["id"] not in used:
                return spec
        stage_name = "独立验证" if stage == "probe" else "延迟复测" if stage == "retest" else "训练"
        raise HTTPException(
            status_code=409,
            detail=f"{stage_name}题库中没有尚未作答的新题；系统不会重复旧题。",
        )

    def _used_question_ids(self, learner_id: str, topic_id: str) -> set[str]:
        rows = self._db.scalars(
            select(AdaptiveSessionRecord).where(
                AdaptiveSessionRecord.learner_id == learner_id,
                AdaptiveSessionRecord.topic_id == topic_id,
            )
        ).all()
        used: set[str] = set()
        for row in rows:
            snapshot = row.snapshot
            for key in ("diagnosticQuestion", "practiceQuestion", "probeQuestion", "retestQuestion"):
                question = snapshot.get(key)
                if question is not None:
                    used.add(question["id"])
            for event in snapshot.get("evidence", []):
                if event.get("questionId"):
                    used.add(event["questionId"])
        return used

    def _append_event(
        self,
        snapshot: dict,
        *,
        kind: str,
        question_id: str | None,
        answer: str | None,
        score: float | None,
        hint_used: bool,
        summary: str,
        duration_seconds: int | None = None,
        evaluated: bool = False,
    ) -> dict:
        evidence_type = EvidenceType.PRACTICE_ANSWER_EVALUATED if evaluated else EvidenceType.LEARNING_STARTED
        payload = {
            "adaptiveKind": kind,
            "score": score,
            "hintUsed": hint_used,
            "summary": summary,
        }
        if evaluated:
            payload["is_correct"] = score is not None and score >= 0.75
            payload["difficulty"] = 0.5
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
            "answer": answer,
            "score": score,
            "hintUsed": hint_used,
            "createdAt": _iso(native.occurred_at),
            "summary": summary,
        }
        snapshot["evidence"].append(event)
        return event

    def _project_mastery(self, event: dict) -> None:
        native = self._evidence.get_by_id(event["id"])
        result = self._mastery.project(native)
        if result is not None:
            self._evidence.update_payload(
                event["id"],
                {
                    "masteryBefore": result.mastery_before,
                    "masteryAfter": result.mastery_after,
                    "confidence": result.confidence,
                    "evidenceCount": result.evidence_count,
                },
            )

    def _knowledge_record(
        self,
        learner_id: str,
        topic_id: str,
        *,
        create: bool,
    ) -> AdaptiveKnowledgeState | None:
        topic = TOPICS[topic_id]
        knowledge = self._db.scalar(
            select(AdaptiveKnowledgeState).where(
                AdaptiveKnowledgeState.learner_id == learner_id,
                AdaptiveKnowledgeState.knowledge_point_id == topic["knowledgePointId"],
            )
        )
        if knowledge is None and create:
            mastery = self._db.scalar(
                select(MasteryRecord).where(
                    MasteryRecord.learner_id == learner_id,
                    MasteryRecord.knowledge_point_id == topic["knowledgePointId"],
                )
            )
            prior = mastery.mastery_score if mastery and mastery.evidence_count else None
            count = mastery.evidence_count if mastery else 0
            knowledge = AdaptiveKnowledgeState(
                id=str(uuid.uuid4()),
                learner_id=learner_id,
                knowledge_point_id=topic["knowledgePointId"],
                name=topic["name"],
                mastery=prior,
                uncertainty=round(1 / math.sqrt(count + 1), 4),
                evidence_count=count,
                misconceptions=[],
                model_version=MODEL_VERSION,
            )
            self._db.add(knowledge)
            self._db.flush()
        return knowledge

    @staticmethod
    def _knowledge_payload(knowledge: AdaptiveKnowledgeState) -> dict:
        return {
            "knowledgePointId": knowledge.knowledge_point_id,
            "name": knowledge.name,
            "mastery": None if knowledge.mastery is None else round(knowledge.mastery, 4),
            "uncertainty": round(knowledge.uncertainty, 4),
            "evidenceCount": knowledge.evidence_count,
            "misconceptions": knowledge.misconceptions or [],
            "modelVersion": knowledge.model_version,
        }

    def _update_bkt(
        self,
        knowledge: AdaptiveKnowledgeState,
        score: float,
        misconception_code: str,
        *,
        stage: str,
    ) -> None:
        prior = knowledge.mastery if knowledge.mastery is not None else 0.5
        slip, guess, transition = 0.1, 0.2, 0.08
        likelihood_mastered = score * (1 - slip) + (1 - score) * slip
        likelihood_unmastered = score * guess + (1 - score) * (1 - guess)
        denominator = prior * likelihood_mastered + (1 - prior) * likelihood_unmastered
        posterior = (prior * likelihood_mastered / denominator) if denominator else prior
        knowledge.mastery = min(1.0, posterior + (1 - posterior) * transition)
        knowledge.evidence_count += 1
        knowledge.uncertainty = round(1 / math.sqrt(knowledge.evidence_count + 1), 4)
        items = list(knowledge.misconceptions or [])
        current = next((item for item in items if item["code"] == misconception_code), None)
        prior_probability = current["probability"] if current else 0.05
        proposed_probability = (
            prior_probability + 0.45 * (1 - score)
            if stage == "diagnostic"
            else prior_probability * (0.5 if score >= 0.75 else 1.1)
        )
        probability = min(0.95, max(0.02, proposed_probability))
        entry = {"code": misconception_code, "probability": round(probability, 4)}
        if current:
            items[items.index(current)] = entry
        elif stage == "diagnostic" or score < 0.75:
            items.append(entry)
        knowledge.misconceptions = items
        knowledge.updated_at = utc_now()

    def _prerequisite_statuses(self, learner_id: str, topic: dict) -> list[dict]:
        statuses = []
        for prerequisite in topic["prerequisites"]:
            knowledge = self._db.scalar(
                select(AdaptiveKnowledgeState).where(
                    AdaptiveKnowledgeState.learner_id == learner_id,
                    AdaptiveKnowledgeState.knowledge_point_id == prerequisite["id"],
                )
            )
            if knowledge is not None and knowledge.evidence_count > 0:
                status = "supported" if (knowledge.mastery or 0.0) >= 0.65 else "gap"
            else:
                mastery = self._db.scalar(
                    select(MasteryRecord).where(
                        MasteryRecord.learner_id == learner_id,
                        MasteryRecord.knowledge_point_id == prerequisite["id"],
                    )
                )
                if mastery is None or mastery.evidence_count == 0:
                    status = "unknown"
                else:
                    status = "supported" if mastery.mastery_score >= 0.65 else "gap"
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
                (option["id"] for option in spec.get("options", []) if option["text"].strip() == answer.strip()),
                None,
            )
            score = 1.0 if selected == spec["correctOptionId"] else 0.0
            return {
                "score": score,
                "feedback": spec["rubric"] if score else f"未满足评分要点：{spec['rubric']}",
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
        knowledge = self._knowledge_record(learner_id, target_topic_id, create=False)
        prior_mastery = None
        if knowledge is None or knowledge.evidence_count == 0:
            prior_mastery = self._db.scalar(
                select(MasteryRecord).where(
                    MasteryRecord.learner_id == learner_id,
                    MasteryRecord.knowledge_point_id == target_topic["knowledgePointId"],
                )
            )
        has_prior_evidence = (
            knowledge is not None and knowledge.evidence_count > 0
        ) or (prior_mastery is not None and prior_mastery.evidence_count > 0)
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
            mastery = (
                knowledge.mastery
                if knowledge is not None and knowledge.mastery is not None
                else prior_mastery.mastery_score if prior_mastery is not None else 0.0
            )
            action = "guided_practice" if mastery < 0.4 else "transfer_challenge" if mastery >= 0.75 else "retrieval_practice"
            reason = "C 组仅根据目标知识点的掌握证据选择后续练习，不匹配误解代码。"
        elif misconception_status == "persisting":
            action = "prerequisite_repair"
            reason = "当前主题的独立题仍显示误解，先回到前置/规则基础。"
        elif score >= 0.75:
            target_mastery = (
                knowledge.mastery
                if knowledge is not None and knowledge.mastery is not None
                else prior_mastery.mastery_score if prior_mastery is not None else 0.0
            )
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
        knowledge_ids = {topic["knowledgePointId"] for topic in TOPICS.values()}
        rows = self._db.scalars(
            select(AdaptiveKnowledgeState).where(
                AdaptiveKnowledgeState.learner_id == learner_id,
                AdaptiveKnowledgeState.knowledge_point_id.in_(knowledge_ids),
            )
        ).all()
        return [self._knowledge_payload(row) for row in rows]

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

    @staticmethod
    def _public(snapshot: dict) -> dict:
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
        return {key: snapshot.get(key) for key in keys}
