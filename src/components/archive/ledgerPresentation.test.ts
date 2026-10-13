import { describe, expect, it } from 'vitest';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import type { LearningEvidence, PracticeEvaluationResponse } from '@/lib/educationApi';
import { buildEvidenceLedger } from './ledgerPresentation';

const start: LearningEvidence = {
  id: 'evidence-start', learnerId: 'learner-1', courseId: 'course-1',
  evidenceType: 'learning_started', source: 'current_study_plan',
  knowledgePointId: 'kp-1', sessionId: 'session-1', payload: {},
  occurredAt: '2026-10-13T08:00:00Z',
};
const practiceEvidence: LearningEvidence = {
  id: 'evidence-practice', learnerId: 'learner-1', courseId: 'course-1',
  evidenceType: 'practice_answer_evaluated', source: 'learning_space',
  knowledgePointId: 'kp-1', questionId: 'question-1', sessionId: 'session-1',
  payload: {}, occurredAt: '2026-10-13T09:00:00Z',
};
const practice: PracticeEvaluationResponse = {
  evidence: practiceEvidence,
  masteryBefore: 0.42,
  masteryAfter: 0.57,
  confidence: 0.8,
  evidenceCount: 3,
  message: '本次练习已记录',
  replanning: {
    status: 'not_needed', performed: false, reasonCodes: ['NO_MATERIAL_CHANGE'],
    previousPlanId: 'plan-1', newPlan: null, previousTopTask: null, newTopTask: null,
  },
};
const reflection: ReflectionResult = {
  learnerId: 'learner-1', courseId: 'course-1', taskId: 'task-1',
  knowledgePointId: 'kp-1', knowledgePointName: '链表',
  submittedText: '理解指针连接', submittedAt: '2026-10-13T10:00:00Z',
  coveredConcepts: ['节点连接'], missingConcepts: ['头指针'], nextSuggestion: '回看头指针',
};

describe('buildEvidenceLedger', () => {
  it('orders a newer naive UTC API event ahead of an older browser reflection timestamp', () => {
    const rows = buildEvidenceLedger({
      evidence: [{ ...start, occurredAt: '2026-10-13T17:10:00' }],
      practiceEvaluations: [],
      reflectionResults: [{ ...reflection, submittedAt: '2026-10-13T17:05:00Z' }],
      knowledgeNames: { 'kp-1': '链表' }, learnerId: 'learner-1', courseId: 'course-1',
    });
    expect(rows.map(row => row.event)).toEqual(['开始学习 · 链表', '复述反馈 · 链表']);
  });
  it('sorts real records newest first, scopes them, and shows mastery changes only when returned', () => {
    const rows = buildEvidenceLedger({
      evidence: [start, practiceEvidence, {
        ...start, id: 'foreign', learnerId: 'learner-2', occurredAt: '2026-10-13T11:00:00Z',
      }],
      practiceEvaluations: [practice],
      reflectionResults: [reflection, { ...reflection, taskId: 'foreign-task', learnerId: 'learner-2' }],
      knowledgeNames: { 'kp-1': '链表' },
      learnerId: 'learner-1',
      courseId: 'course-1',
    });

    expect(rows.map((row) => row.event)).toEqual(['复述反馈 · 链表', '练习评价 · 链表', '开始学习 · 链表']);
    expect(rows[0]).toMatchObject({
      source: '当前学习流程状态（本地）',
      actualIds: ['task-1', 'kp-1'],
      result: '已覆盖：节点连接；待补充：头指针',
      masteryChange: null,
    });
    expect(rows[1]).toMatchObject({
      actualIds: ['evidence-practice', 'question-1', 'session-1', 'kp-1'],
      result: '本次练习已记录',
      masteryChange: 'M 42% → 57%（+15 个百分点）',
    });
    expect(rows[2]).toMatchObject({
      actualIds: ['evidence-start', 'session-1', 'kp-1'],
      masteryChange: null,
    });
    expect(rows).toHaveLength(3);
  });
});
