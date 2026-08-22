import { beforeEach, describe, expect, it } from 'vitest';
import type { PracticeEvaluationResponse } from '@/lib/educationApi';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import { useLearningLoopStore } from './useLearningLoopStore';

const reflectionResult: ReflectionResult = {
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  submittedText: '互斥条件会限制资源共享。',
  submittedAt: '2026-08-22T10:00:00.000Z',
  coveredConcepts: ['互斥条件'],
  missingConcepts: ['循环等待'],
  nextSuggestion: '建议回看“循环等待”课程章节，再补充复述。',
};

const practiceEvaluation: PracticeEvaluationResponse = {
  evidence: {
    id: 'evidence-practice-1',
    learnerId: 'learner-1',
    evidenceType: 'practice_answer_evaluated',
    source: 'learning_space',
    courseId: 'course-os',
    knowledgePointId: 'kp-deadlock',
    questionId: 'question-1',
    payload: {},
    occurredAt: '2026-08-22T10:05:00.000Z',
  },
  masteryBefore: 0.4,
  masteryAfter: 0.5,
  confidence: 0.7,
  evidenceCount: 2,
  message: '练习评价已记录。',
  replanning: {
    status: 'not_needed',
    performed: false,
    reasonCodes: ['NO_MATERIAL_CHANGE'],
    previousPlanId: 'plan-1',
    newPlan: null,
    previousTopTask: null,
    newTopTask: null,
  },
};

describe('useLearningLoopStore', () => {
  beforeEach(() => {
    useLearningLoopStore.setState({
      learningSessionIds: {},
      reflectionResults: {},
      practiceEvaluations: {},
    });
  });

  it('starts with empty session records', () => {
    expect(useLearningLoopStore.getState().learningSessionIds).toEqual({});
    expect(useLearningLoopStore.getState().reflectionResults).toEqual({});
    expect(useLearningLoopStore.getState().practiceEvaluations).toEqual({});
  });

  it('stores reflection and practice results under their task contract keys', () => {
    const store = useLearningLoopStore.getState();

    store.setReflectionResult('task-1', reflectionResult);
    store.setPracticeEvaluation('task-1', practiceEvaluation);

    expect(useLearningLoopStore.getState().reflectionResults).toEqual({
      'task-1': reflectionResult,
    });
    expect(
      useLearningLoopStore.getState().reflectionResults['task-2'],
    ).toBeUndefined();
    expect(useLearningLoopStore.getState().practiceEvaluations).toEqual({
      'task-1': practiceEvaluation,
    });
  });

  it('stores each real learning session under its task id', () => {
    const store = useLearningLoopStore.getState();

    store.setLearningSessionId('task-1', 'session-1');
    store.setLearningSessionId('task-2', 'session-2');
    store.setLearningSessionId('task-1', 'session-1-restarted');

    expect(useLearningLoopStore.getState().learningSessionIds).toEqual({
      'task-1': 'session-1-restarted',
      'task-2': 'session-2',
    });
  });
});
