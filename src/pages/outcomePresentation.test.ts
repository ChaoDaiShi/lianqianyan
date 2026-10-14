import { describe, expect, it } from 'vitest';
import type { LeapOutcome, LeapSession } from '@/lib/adaptiveApi';
import {
  independentOutcomes,
  independentSessions,
  isIndependentOutcome,
  serializeOutcomeCsv,
  summarizeOutcomes,
} from './outcomePresentation';

function outcome(overrides: Partial<LeapOutcome> = {}): LeapOutcome {
  return {
    id: 'outcome-1',
    interventionId: 'intervention-1',
    questionId: 'question-1',
    correct: true,
    score: 0.75,
    feedback: '通过',
    independent: true,
    hintUsed: false,
    durationSeconds: 30,
    preScore: 0.25,
    postScore: 0.75,
    scoreComparable: false,
    comparisonReason: '前后题型未校准，不计算分数差值。',
    observedGain: null,
    misconceptionStatus: 'repaired',
    retestScore: null,
    completedAt: '2026-10-13T10:00:00.000Z',
    ...overrides,
  };
}

function session(
  id: string,
  result: LeapOutcome | null,
  overrides: Partial<LeapSession> = {},
): LeapSession {
  return {
    id,
    learnerId: 'learner-1',
    courseId: 'course-ds',
    topicId: 'linked-list',
    topicName: '单链表插入',
    knowledgePointId: 'kp-linked-list',
    policy: 'leap',
    experimentGroup: 'D',
    ablation: 'none',
    catalogVersion: 'catalog-1',
    policyVersion: 'policy-1',
    phase: 'completed',
    createdAt: '2026-10-13T09:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z',
    diagnosticQuestion: {
      id: 'diagnostic-1',
      prompt: '诊断题',
      options: [],
      responseMode: 'text',
    },
    practiceQuestion: null,
    probeQuestion: null,
    retestQuestion: null,
    diagnosis: null,
    decision: null,
    teaching: null,
    outcome: result,
    state: {
      knowledgePointId: 'kp-linked-list',
      name: '单链表插入',
      mastery: 0.75,
      uncertainty: 0.2,
      evidenceCount: 2,
      misconceptions: [],
      modelVersion: 'bkt-1',
    },
    evidence: [],
    nextStep: null,
    retestDueAt: null,
    assessmentStatus: result ? 'saved' : 'pending',
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

describe('outcome presentation', () => {
  it('summarizes only completed no-hint independent outcomes without inventing a gain', () => {
    const summary = summarizeOutcomes([
      ...independentOutcomes([
        session('s1', outcome({ postScore: 0.5 })),
        session('s2', outcome({ id: 'outcome-2', preScore: 0.5, postScore: 1 })),
        session('guided', outcome({ id: 'guided', independent: false, hintUsed: true })),
        session('hinted', outcome({ id: 'hinted', hintUsed: true })),
      ]),
    ]);

    expect(summary).toEqual({
      n: 2,
      preN: 2,
      preMean: 0.375,
      postN: 2,
      postMean: 0.75,
      postSd: Math.sqrt(0.125),
      gainN: 0,
      meanGain: null,
      retestN: 0,
      retestMean: null,
    });
  });

  it('aggregates only backend-marked comparable gains and excludes missing pre-scores', () => {
    const summary = summarizeOutcomes([
      outcome({ preScore: null, postScore: 0.75, observedGain: null }),
      outcome({
        id: 'comparable',
        preScore: 0.5,
        postScore: 0.75,
        scoreComparable: true,
        comparisonReason: '同题型且同评分标准。',
        observedGain: 0.25,
      }),
    ]);

    expect(summary).toMatchObject({
      n: 2,
      preN: 1,
      preMean: 0.5,
      postN: 2,
      postMean: 0.75,
      gainN: 1,
      meanGain: 0.25,
    });
    expect(summary).not.toHaveProperty('normalizedGain');
  });

  it('keeps delayed retest summaries to real scores from no-hint independent outcomes', () => {
    const sessions = [
      session('retested', outcome({ retestScore: 0.5 })),
      session('not-retested', outcome({ id: 'not-retested' })),
      session('guided', outcome({ id: 'guided', independent: false, retestScore: 1 })),
      session('hinted', outcome({ id: 'hinted', hintUsed: true, retestScore: 1 })),
    ];

    expect(independentSessions(sessions).map(item => item.id)).toEqual([
      'retested',
      'not-retested',
    ]);
    expect(isIndependentOutcome(outcome({ independent: false }))).toBe(false);
    expect(isIndependentOutcome(outcome({ hintUsed: true }))).toBe(false);
    expect(summarizeOutcomes(independentOutcomes(sessions))).toMatchObject({
      n: 2,
      retestN: 1,
      retestMean: 0.5,
    });
  });

  it('converts the actual export payload into escaped session CSV rows', () => {
    const csv = serializeOutcomeCsv({
      version: 'export-v1',
      exportedAt: '2026-10-13T10:00:00.000Z',
      experiments: [],
      sessions: [
        session('session-1', outcome({ feedback: '通过, "边界条件"\n已记录' }), {
          topicName: '单链表, 插入',
        }),
      ],
    });

    expect(csv.split('\r\n')[0]).toContain('会话 ID,策略组,学习概念');
    expect(csv.split('\r\n')[0]).toContain('前后测可比,差值说明,观察到的可比增益');
    expect(csv).toContain('"单链表, 插入"');
    expect(csv).toContain('"通过, ""边界条件""\n已记录"');
    expect(csv).toContain(',0.75,');
    expect(csv).toContain('前后题型未校准，不计算分数差值。');
    expect(csv).toContain('不可比');
  });

  it('leaves missing pre-scores and observed gains blank in CSV exports', () => {
    const csv = serializeOutcomeCsv({
      version: 'export-v1',
      exportedAt: '2026-10-13T10:00:00.000Z',
      experiments: [],
      sessions: [session('missing-pre', outcome({ preScore: null }))],
    });

    expect(csv).toContain('2026-10-13T10:00:00.000Z,,0.75,');
    expect(csv).toContain('不可比,前后题型未校准，不计算分数差值。,,');
    expect(csv).not.toContain('NaN');
  });

  it('exports group-level comparable gain fields instead of normalized gain', async () => {
    const { serializeGroupOutcomeCsv } = await import('./outcomePresentation');
    const csv = serializeGroupOutcomeCsv([
      session('one', outcome({ preScore: 0.2, postScore: 0.8 })),
    ]);

    expect(csv.split('\r\n')[0]).toContain('可比增益会话数,可比增益均值');
    expect(csv).not.toContain('归一化增益');
  });
});
