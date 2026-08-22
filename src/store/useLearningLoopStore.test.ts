import { beforeEach, describe, expect, it } from 'vitest';
import type {
  AgentChatResponse,
  PracticeEvaluationResponse,
} from '@/lib/educationApi';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import { useLearningLoopStore } from './useLearningLoopStore';

const reflectionResult: ReflectionResult = {
  learnerId: 'learner-1',
  courseId: 'course-os',
  taskId: 'task-1',
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

const tutorResponse: AgentChatResponse = {
  answer: '死锁需要同时满足四个必要条件。',
  selectedCapability: 'tutoring',
  provider: 'test-provider',
  model: 'test-model',
  responseMode: 'provider',
  sources: [],
  contextUsed: ['kp-deadlock'],
  suggestedActions: [],
  agentTrace: [],
};

describe('useLearningLoopStore', () => {
  beforeEach(() => {
    useLearningLoopStore.setState({
      learningSessionIds: {},
      reflectionResults: {},
      practiceEvaluations: {},
      tutorResponses: {},
    });
  });

  it('starts with empty session records', () => {
    expect(useLearningLoopStore.getState().learningSessionIds).toEqual({});
    expect(useLearningLoopStore.getState().reflectionResults).toEqual({});
    expect(useLearningLoopStore.getState().practiceEvaluations).toEqual({});
    expect(useLearningLoopStore.getState().tutorResponses).toEqual({});
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

  it('retains the latest real tutor response under its task id', () => {
    const store = useLearningLoopStore.getState();

    store.setTutorResponse('task-1', tutorResponse);

    expect(useLearningLoopStore.getState().tutorResponses).toEqual({
      'task-1': tutorResponse,
    });
  });

  it('starts a new task session without inheriting prior loop results', () => {
    const store = useLearningLoopStore.getState();

    store.setReflectionResult('task-1', reflectionResult);
    store.setPracticeEvaluation('task-1', practiceEvaluation);
    store.setTutorResponse('task-1', tutorResponse);
    store.setLearningSessionId('task-1', 'session-1');
    store.setLearningSessionId('task-2', 'session-2');
    store.setReflectionResult('task-2', reflectionResult);
    store.setPracticeEvaluation('task-2', practiceEvaluation);
    store.setTutorResponse('task-2', tutorResponse);
    store.setReflectionResult('task-1', reflectionResult);
    store.setPracticeEvaluation('task-1', practiceEvaluation);
    store.setTutorResponse('task-1', tutorResponse);
    store.setLearningSessionId('task-1', 'session-1-restarted');

    expect(useLearningLoopStore.getState().learningSessionIds).toEqual({
      'task-1': 'session-1-restarted',
      'task-2': 'session-2',
    });
    expect(useLearningLoopStore.getState().reflectionResults).toEqual({
      'task-2': reflectionResult,
    });
    expect(useLearningLoopStore.getState().practiceEvaluations).toEqual({
      'task-2': practiceEvaluation,
    });
    expect(useLearningLoopStore.getState().tutorResponses).toEqual({
      'task-2': tutorResponse,
    });
  });

  it('keeps task results when the same real session id is recorded again', () => {
    const store = useLearningLoopStore.getState();

    store.setLearningSessionId('task-1', 'session-1');
    store.setReflectionResult('task-1', reflectionResult);
    store.setPracticeEvaluation('task-1', practiceEvaluation);
    store.setTutorResponse('task-1', tutorResponse);
    store.setLearningSessionId('task-1', 'session-1');

    const state = useLearningLoopStore.getState();
    expect(state.reflectionResults['task-1']).toEqual(reflectionResult);
    expect(state.practiceEvaluations['task-1']).toEqual(practiceEvaluation);
    expect(state.tutorResponses['task-1']).toEqual(tutorResponse);
  });
});
