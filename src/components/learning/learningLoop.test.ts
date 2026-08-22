import { describe, expect, it } from 'vitest';
import type { PersistedStudyPlan } from '@/domain';
import type {
  KnowledgePointContent,
  LearningEvidence,
  PracticeEvaluationResponse,
} from '@/lib/educationApi';
import {
  buildJourneyEvents,
  buildReflectionResult,
  deriveLearningStages,
  filterLearningEvidence,
  getPracticeReplanningText,
  type ReflectionResult,
} from './learningLoop';

function createEvidence(
  overrides: Partial<LearningEvidence> = {},
): LearningEvidence {
  return {
    id: 'evidence-practice-1',
    learnerId: 'learner-1',
    evidenceType: 'practice_answer_evaluated',
    source: 'learning_space',
    courseId: 'course-1',
    knowledgePointId: 'kp-deadlock',
    questionId: 'question-1',
    payload: {},
    occurredAt: '2026-08-22T09:00:00.000Z',
    ...overrides,
  };
}

function createEvaluation(occurredAt: string): PracticeEvaluationResponse {
  return {
    evidence: createEvidence({ occurredAt }),
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
}

const reflectionResult: ReflectionResult = {
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  submittedText: '互斥条件会限制资源共享。',
  submittedAt: '2026-08-22T10:00:00.000Z',
  coveredConcepts: ['互斥条件'],
  missingConcepts: ['循环等待'],
  nextSuggestion: '建议回看“循环等待”课程章节，再补充复述。',
};

describe('buildReflectionResult', () => {
  it('matches only concepts named in the submitted reflection', () => {
    const knowledge: KnowledgePointContent = {
      knowledgePointId: 'kp-deadlock',
      title: '死锁',
      sections: [
        { title: '互斥条件', content: '资源不能同时共享。' },
        { title: '循环等待', content: '进程形成环形等待链。' },
      ],
    };

    const result = buildReflectionResult({
      knowledge,
      submittedText: '互斥条件表示资源不能同时共享。',
      submittedAt: '2026-08-22T10:00:00.000Z',
    });

    expect(result).toMatchObject({
      knowledgePointId: 'kp-deadlock',
      knowledgePointName: '死锁',
      submittedText: '互斥条件表示资源不能同时共享。',
      submittedAt: '2026-08-22T10:00:00.000Z',
      coveredConcepts: ['互斥条件'],
      missingConcepts: ['循环等待'],
    });
    expect(result.nextSuggestion).toContain('循环等待');
  });

  it('normalizes punctuation and whitespace before matching a concept title', () => {
    const knowledge: KnowledgePointContent = {
      knowledgePointId: 'kp-deadlock',
      title: '死锁',
      sections: [{ title: '互斥条件', content: '资源不能同时共享。' }],
    };

    const result = buildReflectionResult({
      knowledge,
      submittedText: '互斥， 条件表示资源不能同时共享。',
      submittedAt: '2026-08-22T10:00:00.000Z',
    });

    expect(result.coveredConcepts).toEqual(['互斥条件']);
  });

  it('does not match a concept collapsed to one Latin character', () => {
    const knowledge: KnowledgePointContent = {
      knowledgePointId: 'kp-cpp',
      title: 'Programming languages',
      sections: [
        { title: 'C++', content: 'A systems programming language.' },
        { title: '锁', content: 'A one-character non-Latin concept.' },
      ],
    };

    const result = buildReflectionResult({
      knowledge,
      submittedText: 'Process scheduling uses a 锁.',
      submittedAt: '2026-08-22T10:00:00.000Z',
    });

    expect(result.coveredConcepts).toEqual(['锁']);
    expect(result.missingConcepts).toEqual(['C++']);
    expect(result.nextSuggestion).toContain('C++');
  });

  it('returns no concepts when the course has no non-empty section titles', () => {
    const knowledge: KnowledgePointContent = {
      knowledgePointId: 'kp-empty',
      title: '空课程',
      sections: [
        { title: '', content: '没有标题。' },
        { title: '   ', content: '只有空白标题。' },
      ],
    };

    const result = buildReflectionResult({
      knowledge,
      submittedText: '任意复述',
      submittedAt: '2026-08-22T10:00:00.000Z',
    });

    expect(result.coveredConcepts).toEqual([]);
    expect(result.missingConcepts).toEqual([]);
  });

  it('ignores a section title whose normalized concept anchor is empty', () => {
    const knowledge: KnowledgePointContent = {
      knowledgePointId: 'kp-empty-anchor',
      title: '空锚点课程',
      sections: [{ title: '……', content: '标题只有标点。' }],
    };

    const result = buildReflectionResult({
      knowledge,
      submittedText: '任意复述',
      submittedAt: '2026-08-22T10:00:00.000Z',
    });

    expect(result.coveredConcepts).toEqual([]);
    expect(result.missingConcepts).toEqual([]);
  });

  it('suggests comparing against all returned sections when every concept is covered', () => {
    const knowledge: KnowledgePointContent = {
      knowledgePointId: 'kp-deadlock',
      title: '死锁',
      sections: [
        { title: '互斥条件', content: '资源不能同时共享。' },
        { title: '循环等待', content: '进程形成环形等待链。' },
      ],
    };

    const result = buildReflectionResult({
      knowledge,
      submittedText: '互斥条件与循环等待都可能参与死锁形成。',
      submittedAt: '2026-08-22T10:00:00.000Z',
    });

    expect(result.missingConcepts).toEqual([]);
    expect(result.nextSuggestion).toContain('全部课程章节');
  });
});

describe('deriveLearningStages', () => {
  it('keeps verification current until practice evidence occurs after reflection', () => {
    const evaluation = createEvaluation('2026-08-22T09:00:00.000Z');

    expect(
      deriveLearningStages({
        hasLearningStarted: true,
        hasTutorResponse: true,
        practiceEvaluation: evaluation,
        reflectionResult,
      }).map((stage) => stage.status),
    ).toEqual(['completed', 'completed', 'completed', 'completed', 'current']);
  });

  it('completes verification when practice evidence occurs after reflection', () => {
    const evaluation = createEvaluation('2026-08-22T10:00:00.001Z');

    expect(
      deriveLearningStages({
        hasLearningStarted: true,
        hasTutorResponse: true,
        practiceEvaluation: evaluation,
        reflectionResult,
      }).map((stage) => stage.status),
    ).toEqual(['completed', 'completed', 'completed', 'completed', 'completed']);
  });

  it('marks only the first unmet stage current and locks every later stage', () => {
    expect(
      deriveLearningStages({
        hasLearningStarted: false,
        hasTutorResponse: true,
        practiceEvaluation: createEvaluation('2026-08-22T10:00:00.001Z'),
        reflectionResult,
      }).map((stage) => stage.status),
    ).toEqual(['current', 'locked', 'locked', 'locked', 'locked']);
  });
});

describe('filterLearningEvidence', () => {
  it('keeps all matching learning-start evidence for read-only listing', () => {
    const currentPlanLearning = createEvidence({
      id: 'evidence-learning-current-plan',
      evidenceType: 'learning_started',
      source: 'current_study_plan',
      sessionId: 'session-current',
    });
    const recommendedPathLearning = createEvidence({
      id: 'evidence-learning-recommended',
      evidenceType: 'learning_started',
      source: 'recommended_path',
      sessionId: 'session-recommended',
    });

    expect(
      filterLearningEvidence({
        evidence: [currentPlanLearning, recommendedPathLearning],
        learnerId: 'learner-1',
        courseId: 'course-1',
        knowledgePointId: 'kp-deadlock',
      }).learningStarted,
    ).toEqual([currentPlanLearning, recommendedPathLearning]);
  });

  it('accepts only current-plan learning-start evidence from the exact task session', () => {
    const matchingLearning = createEvidence({
      id: 'evidence-learning-1',
      evidenceType: 'learning_started',
      source: 'current_study_plan',
      sessionId: 'session-current',
      occurredAt: '2026-08-22T10:00:00.000Z',
    });
    const recommendedPathLearning = createEvidence({
      id: 'evidence-learning-recommended',
      evidenceType: 'learning_started',
      source: 'recommended_path',
      sessionId: 'session-current',
      occurredAt: '2026-08-22T10:01:00.000Z',
    });
    const otherSessionLearning = createEvidence({
      id: 'evidence-learning-other-session',
      evidenceType: 'learning_started',
      source: 'current_study_plan',
      sessionId: 'session-previous',
      occurredAt: '2026-08-22T10:02:00.000Z',
    });
    const matchingPractice = createEvidence({
      id: 'evidence-practice-1',
      evidenceType: 'practice_answer_evaluated',
      occurredAt: '2026-08-22T08:30:00.000Z',
    });
    const otherLearner = createEvidence({
      id: 'evidence-other-learner',
      learnerId: 'learner-2',
      evidenceType: 'learning_started',
    });
    const otherCourse = createEvidence({
      id: 'evidence-other-course',
      courseId: 'course-2',
      evidenceType: 'practice_answer_evaluated',
    });
    const otherKnowledgePoint = createEvidence({
      id: 'evidence-other-knowledge',
      knowledgePointId: 'kp-scheduling',
      evidenceType: 'learning_started',
    });
    const evidence = [
      recommendedPathLearning,
      otherSessionLearning,
      matchingLearning,
      otherLearner,
      matchingPractice,
      otherCourse,
      otherKnowledgePoint,
    ];

    const result = filterLearningEvidence({
      evidence,
      learnerId: 'learner-1',
      courseId: 'course-1',
      knowledgePointId: 'kp-deadlock',
      learningSessionId: 'session-current',
    });

    expect(result).toEqual({
      learningStarted: [matchingLearning],
      practiceEvaluated: [matchingPractice],
    });
    expect(evidence).toEqual([
      recommendedPathLearning,
      otherSessionLearning,
      matchingLearning,
      otherLearner,
      matchingPractice,
      otherCourse,
      otherKnowledgePoint,
    ]);
  });

  it('returns no learning-start evidence without a current task session', () => {
    const matchingLearning = createEvidence({
      evidenceType: 'learning_started',
      source: 'current_study_plan',
      sessionId: 'session-current',
      occurredAt: '2026-08-22T10:00:00.000Z',
    });

    expect(
      filterLearningEvidence({
        evidence: [matchingLearning],
        learnerId: 'learner-1',
        courseId: 'course-1',
        knowledgePointId: 'kp-deadlock',
        learningSessionId: null,
      }).learningStarted,
    ).toEqual([]);
  });
});

describe('getPracticeReplanningText', () => {
  it.each([
    ['performed', '学习计划已根据本次评价调整。'],
    ['not_needed', '本次评价已记录，当前学习计划无需调整。'],
    ['failed', '本次评价已记录，但学习计划调整未成功。'],
  ] as const)('maps %s to deterministic presentation text', (status, expected) => {
    const evaluation = createEvaluation('2026-08-22T10:05:00.000Z');
    evaluation.replanning.status = status;
    evaluation.replanning.performed = status === 'performed';

    expect(getPracticeReplanningText(evaluation)).toBe(expected);
  });
});

describe('buildJourneyEvents', () => {
  it('deduplicates practice evaluations already represented by Evidence id', () => {
    const practiceEvidence = createEvidence();
    const evaluation = createEvaluation(practiceEvidence.occurredAt);
    const events = buildJourneyEvents({
      evidence: [practiceEvidence],
      plan: null,
      practiceEvaluations: [evaluation],
      knowledgeNames: { 'kp-deadlock': '死锁' },
      learnerId: 'learner-1',
      courseId: 'course-1',
    });

    expect(events.filter((event) => event.id === practiceEvidence.id)).toHaveLength(1);
  });

  it('uses source timestamps and labels plan entries as context', () => {
    const learningEvidence = createEvidence({
      id: 'evidence-learning-1',
      evidenceType: 'learning_started',
      occurredAt: '2026-08-22T08:00:00.000Z',
    });
    const plan: PersistedStudyPlan = {
      id: 'plan-1',
      learnerId: 'learner-1',
      courseId: 'course-1',
      status: 'active',
      strategy: 'diagnosis_driven',
      generatedAt: '2026-08-22T07:00:00.000Z',
      sourceDiagnosisGeneratedAt: '2026-08-22T06:30:00.000Z',
      reasonCodes: ['PRIMARY_FOCUS'],
      createdAt: '2026-08-22T07:00:00.000Z',
      updatedAt: '2026-08-22T07:30:00.000Z',
      tasks: [
        {
          id: 'task-1',
          planId: 'plan-1',
          draftKey: 'draft-1',
          knowledgePointId: 'kp-deadlock',
          knowledgePointName: '死锁',
          actionType: 'remediate',
          priority: 1,
          estimatedMinutes: 20,
          reasonCodes: ['PRIMARY_FOCUS'],
          sourceStatus: 'weak',
          sourcePriorityScore: 1,
          order: 1,
          createdAt: '2026-08-22T07:00:01.000Z',
        },
      ],
    };

    const events = buildJourneyEvents({
      evidence: [learningEvidence],
      plan,
      practiceEvaluations: [],
      knowledgeNames: { 'kp-deadlock': '死锁' },
      learnerId: 'learner-1',
      courseId: 'course-1',
    });

    expect(events.map((event) => event.occurredAt)).toEqual([
      '2026-08-22T08:00:00.000Z',
      '2026-08-22T07:00:01.000Z',
      '2026-08-22T07:00:00.000Z',
    ]);
    expect(events.filter((event) => event.kind.startsWith('plan'))).toEqual([
      expect.objectContaining({ sourceLabel: 'Current Plan' }),
      expect.objectContaining({ sourceLabel: 'Current Plan' }),
    ]);
    expect(events.find((event) => event.id === learningEvidence.id)).toEqual(
      expect.objectContaining({
        occurredAt: learningEvidence.occurredAt,
        sourceLabel: 'LearningEvidence',
      }),
    );
  });
});
