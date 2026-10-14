import { describe, expect, it } from 'vitest';
import type { DiagnosisResult } from '@/domain';
import type {
  LeapCatalog,
  LeapKnowledgeState,
  LeapOutcome,
  LeapOverview,
  LeapQuestion,
  LeapSession,
  LeapTopic,
} from '@/lib/adaptiveApi';
import { selectLeapRecommendation } from './leapRecommendation';

const question: LeapQuestion = {
  id: 'question-1',
  prompt: '题目',
  options: [],
  responseMode: 'choice',
};

function topic(id: string, knowledgePointId: string, name: string): LeapTopic {
  return {
    id,
    knowledgePointId,
    name,
    description: '',
    misconceptionCode: '',
    misconceptionTitle: '',
    prerequisites: [],
    diagnosticQuestion: question,
    strategies: [],
  };
}

const catalog: LeapCatalog = {
  version: 'catalog-v1',
  policyVersion: 'policy-v1',
  reviewStatus: 'reviewed',
  topics: [
    topic('linked list', 'kp-linked', '链表'),
    topic('binary-tree', 'kp-tree', '二叉树'),
  ],
};

function outcome(overrides: Partial<LeapOutcome> = {}): LeapOutcome {
  return {
    id: 'outcome-1',
    interventionId: null,
    questionId: question.id,
    correct: false,
    score: 0,
    feedback: '',
    independent: true,
    hintUsed: false,
    durationSeconds: 30,
    preScore: null,
    postScore: 0,
    scoreComparable: false,
    comparisonReason: null,
    observedGain: null,
    misconceptionStatus: 'persisting',
    retestScore: null,
    completedAt: '2026-10-10T00:00:00.000Z',
    ...overrides,
  };
}

function session(overrides: Partial<LeapSession> = {}): LeapSession {
  const knowledgePointId = overrides.knowledgePointId ?? 'kp-linked';
  const topicId = overrides.topicId ?? 'linked list';
  const topicName = overrides.topicName ?? '链表';
  const state: LeapKnowledgeState = {
    knowledgePointId,
    name: topicName,
    mastery: null,
    uncertainty: 0,
    evidenceCount: 3,
    misconceptions: [],
    modelVersion: 'model-v1',
  };
  return {
    id: 'session-1',
    learnerId: 'learner-1',
    courseId: 'course-ds',
    topicId,
    topicName,
    knowledgePointId,
    policy: 'leap',
    experimentGroup: 'D',
    ablation: 'none',
    catalogVersion: 'catalog-v1',
    policyVersion: 'policy-v1',
    phase: 'completed',
    createdAt: '2026-10-10T00:00:00.000Z',
    updatedAt: '2026-10-10T00:00:00.000Z',
    diagnosticQuestion: question,
    practiceQuestion: null,
    probeQuestion: null,
    retestQuestion: null,
    diagnosis: null,
    decision: null,
    teaching: null,
    outcome: outcome(),
    state,
    evidence: [],
    nextStep: null,
    retestDueAt: null,
    assessmentStatus: 'saved',
    replanning: {
      status: 'not_needed',
      reasonCodes: [],
      previousPlanId: null,
      newPlanId: null,
    },
    questionAvailability: {
      practice: { status: 'available', novelty: 'new', message: '' },
      probe: { status: 'available', novelty: 'new', message: '' },
      retest: { status: 'available', novelty: 'new', message: '' },
    },
    ...overrides,
  };
}

function state(
  knowledgePointId: string,
  evidenceCount: number,
): LeapKnowledgeState {
  return {
    knowledgePointId,
    name: knowledgePointId,
    mastery: null,
    uncertainty: 0,
    evidenceCount,
    misconceptions: [],
    modelVersion: 'model-v1',
  };
}

function overview(
  sessions: LeapSession[] = [],
  states: LeapKnowledgeState[] = [state('kp-linked', 3), state('kp-tree', 2)],
): LeapOverview {
  return {
    catalogVersion: 'catalog-v1',
    questionBankVersion: 'questions-v1',
    policyVersion: 'policy-v1',
    sessions,
    states,
    stats: {
      totalSessions: sessions.length,
      completedSessions: sessions.filter(item => item.phase === 'completed').length,
      independentCorrect: 0,
      independentTotal: 0,
      misconceptionsRepaired: 0,
      delayedDue: 0,
    },
    experiments: [],
    limitations: [],
  };
}

const weakDiagnosis: DiagnosisResult = {
  learnerId: 'learner-1',
  courseId: 'course-ds',
  courseName: '数据结构与算法',
  primaryFocus: {
    knowledgePointId: 'kp-linked',
    knowledgePointName: '链表',
    masteryScore: 0.3,
    confidence: 0.7,
    evidenceCount: 3,
    status: 'weak',
    priorityScore: 1,
    reasonCodes: ['LOW_MASTERY'],
  },
  priorityInterventions: [],
  strengths: [],
  weakPoints: [],
  developingPoints: [],
  unassessedPoints: [],
  summaryCodes: ['LOW_MASTERY'],
  diagnosisGeneratedAt: '2026-10-10T00:00:00.000Z',
};

function input(overrides: {
  courseId?: string;
  sessions?: LeapSession[];
  states?: LeapKnowledgeState[];
  diagnosis?: DiagnosisResult | null;
  nowMs?: number;
} = {}) {
  return {
    courseId: overrides.courseId ?? 'course-ds',
    catalog,
    overview: overview(overrides.sessions, overrides.states),
    diagnosis: overrides.diagnosis ?? null,
    nowMs: overrides.nowMs ?? Date.parse('2026-10-14T00:00:00.000Z'),
  };
}

describe('selectLeapRecommendation', () => {
  it('directs other courses to the course entry without claiming learner evidence', () => {
    const recommendation = selectLeapRecommendation(input({ courseId: 'course-os' }));

    expect(recommendation.kind).toBe('course-entry');
    expect(recommendation.actionLabel).toBe('打开课程入口');
    expect(recommendation.href).toBe('/adaptive');
    expect(recommendation.evidenceCount).toBeNull();
  });

  it('prioritizes the earliest due retest over an unfinished session', () => {
    const unfinished = session({
      id: 'active-session',
      phase: 'teaching',
      updatedAt: '2026-10-13T00:00:00.000Z',
    });
    const laterDue = session({
      id: 'session-due-later',
      updatedAt: '2026-10-12T00:00:00.000Z',
      retestDueAt: '2026-10-12T00:00:00.000Z',
    });
    const earliestDue = session({
      id: 'session due early',
      updatedAt: '2026-10-11T00:00:00.000Z',
      retestDueAt: '2026-10-11T00:00:00.000Z',
    });

    const recommendation = selectLeapRecommendation(
      input({ sessions: [unfinished, laterDue, earliestDue] }),
    );

    expect(recommendation.kind).toBe('retest');
    expect(recommendation.href).toBe('/adaptive?session=session%20due%20early&retest=1');
    expect(recommendation.sessionId).toBe('session due early');
  });

  it('resumes the newest unfinished session and sorts equal timestamps by session ID', () => {
    const older = session({
      id: 'session-z',
      phase: 'teaching',
      updatedAt: '2026-10-12T00:00:00.000Z',
    });
    const tiedLaterId = session({
      id: 'session-z-tie',
      phase: 'probe',
      updatedAt: '2026-10-13T00:00:00.000Z',
    });
    const tiedEarlierId = session({
      id: 'session-a-tie',
      phase: 'diagnostic',
      updatedAt: '2026-10-13T00:00:00.000Z',
    });

    const recommendation = selectLeapRecommendation(
      input({ sessions: [older, tiedLaterId, tiedEarlierId] }),
    );

    expect(recommendation.kind).toBe('resume');
    expect(recommendation.href).toBe('/adaptive?session=session-a-tie');
    expect(recommendation.sessionId).toBe('session-a-tie');
  });

  it('does not let older failures or hinted results override each topic’s latest outcome', () => {
    const oldFailure = session({
      id: 'old-failure',
      updatedAt: '2026-10-10T00:00:00.000Z',
    });
    const newerPass = session({
      id: 'newer-pass',
      updatedAt: '2026-10-12T00:00:00.000Z',
      outcome: outcome({ misconceptionStatus: 'repaired' }),
    });
    const newestHinted = session({
      id: 'newest-hinted',
      topicId: 'binary-tree',
      topicName: '二叉树',
      knowledgePointId: 'kp-tree',
      updatedAt: '2026-10-13T00:00:00.000Z',
      outcome: outcome({ hintUsed: true }),
    });
    const eligible = session({
      id: 'eligible',
      topicId: 'binary-tree',
      topicName: '二叉树',
      knowledgePointId: 'kp-tree',
      updatedAt: '2026-10-11T00:00:00.000Z',
    });

    const recommendation = selectLeapRecommendation(
      input({ sessions: [oldFailure, newerPass, newestHinted, eligible] }),
    );

    expect(recommendation.kind).toBe('diagnose');
  });

  it('recommends the newest topic whose latest session still needs reinforcement', () => {
    const oldFailure = session({
      id: 'old-failure',
      updatedAt: '2026-10-10T00:00:00.000Z',
    });
    const newerPass = session({
      id: 'newer-pass',
      updatedAt: '2026-10-12T00:00:00.000Z',
      outcome: outcome({ misconceptionStatus: 'repaired' }),
    });
    const eligible = session({
      id: 'eligible',
      topicId: 'binary-tree',
      topicName: '二叉树',
      knowledgePointId: 'kp-tree',
      updatedAt: '2026-10-13T00:00:00.000Z',
    });

    const recommendation = selectLeapRecommendation(
      input({ sessions: [oldFailure, newerPass, eligible] }),
    );

    expect(recommendation.kind).toBe('repair');
    expect(recommendation.href).toBe('/adaptive?topic=binary-tree');
    expect(recommendation.topicId).toBe('binary-tree');
    expect(recommendation.sessionId).toBeNull();
    expect(recommendation.evidenceCount).toBe(2);
    expect(recommendation.reason).toContain('无提示验证');
  });

  it('does not repeat an old persisting probe after a recorded retest score', () => {
    const retestedSession = session({
      updatedAt: '2026-10-13T00:00:00.000Z',
      retestDueAt: '2026-10-11T00:00:00.000Z',
      outcome: outcome({
        misconceptionStatus: 'persisting',
        retestScore: 0.9,
      }),
      nextStep: {
        title: '先诊断：二叉树',
        reason: '复测达到规则阈值，继续诊断新主题。',
        actionType: 'diagnostic_probe',
        topicId: 'binary-tree',
      },
    });

    const recommendation = selectLeapRecommendation(
      input({ sessions: [retestedSession] }),
    );

    expect(recommendation.kind).toBe('diagnose');
  });

  it('uses the server next step for a retest that still needs work on the same topic', () => {
    const retestedSession = session({
      outcome: outcome({ misconceptionStatus: 'repaired', retestScore: 0.2 }),
      nextStep: {
        title: '继续：链表',
        reason: '新题规则评分不足，回到两种操作情形的对比讲解。',
        actionType: 'contrastive_teaching',
        topicId: 'linked list',
      },
    });

    const recommendation = selectLeapRecommendation(input({ sessions: [retestedSession] }));

    expect(recommendation.kind).toBe('repair');
    expect(recommendation.title).toBe('按复测后的建议继续巩固');
    expect(recommendation.href).toBe('/adaptive?topic=linked%20list');
    expect(recommendation.reason).toContain(retestedSession.nextStep!.reason);
  });

  it('maps a weak diagnosis only when the matching overview state has evidence', () => {
    const recommendation = selectLeapRecommendation(
      input({ diagnosis: weakDiagnosis, states: [state('kp-linked', 4)] }),
    );

    expect(recommendation.kind).toBe('repair');
    expect(recommendation.title).toBe('建议核查并巩固：链表');
    expect(recommendation.topicId).toBe('linked list');
    expect(recommendation.evidenceCount).toBe(4);
    expect(recommendation.reason).toContain('当前诊断');
    expect(recommendation.reason).not.toContain('误解已确诊');
  });

  it('falls back to a short diagnosis when no specific evidence is available', () => {
    const recommendation = selectLeapRecommendation(
      input({ diagnosis: weakDiagnosis, states: [state('kp-linked', 0)] }),
    );

    expect(recommendation.kind).toBe('diagnose');
    expect(recommendation.title).toBe('做一次短诊断，确定下一步');
    expect(recommendation.reason).toBe('可以通过新的短诊断选择下一项学习主题。');
    expect(recommendation.href).toBe('/adaptive');
    expect(recommendation.evidenceCount).toBeNull();
  });
});
