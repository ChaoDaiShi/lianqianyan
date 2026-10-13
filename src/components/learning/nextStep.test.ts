import { describe, expect, it } from 'vitest';
import type { DiagnosisResult, PersistedStudyPlan } from '@/domain';
import { buildNextStepActions } from './nextStep';

function planWithTasks(tasks: Array<{ id: string; name: string; order: number; actionType?: 'assess' | 'remediate' | 'strengthen' | 'review' }>): PersistedStudyPlan {
  return {
    id: 'plan-1', learnerId: 'l1', courseId: 'course-os', status: 'active',
    strategy: 'diagnosis_driven', generatedAt: '2026-08-30T00:00:00Z', sourceDiagnosisGeneratedAt: '2026-08-30T00:00:00Z',
    reasonCodes: [], createdAt: '2026-08-30T00:00:00Z', updatedAt: '2026-08-30T00:00:00Z',
    tasks: tasks.map((task) => ({
      id: task.id, planId: 'plan-1', draftKey: task.id, knowledgePointId: task.id,
      knowledgePointName: task.name, actionType: task.actionType ?? 'strengthen', priority: task.order,
      estimatedMinutes: 15, reasonCodes: [], sourceStatus: 'weak', sourcePriorityScore: task.order,
      order: task.order, createdAt: '2026-08-30T00:00:00Z',
    })),
  } as unknown as PersistedStudyPlan;
}

function focusPoint(overrides: Partial<{ status: string; masteryScore: number; evidenceCount: number }>) {
  return {
    knowledgePointId: 'kp-deadlock', knowledgePointName: '死锁',
    masteryScore: 0.32, confidence: 0.8, evidenceCount: 3,
    status: 'weak', priorityScore: 1, reasonCodes: ['LOW_MASTERY'],
    ...overrides,
  } as unknown as import('@/domain').KnowledgePointDiagnosis;
}

function diagnosisWith(primaryFocus: ReturnType<typeof focusPoint> | null, unassessed: number = 0): DiagnosisResult {
  return {
    primaryFocus, weakPoints: primaryFocus ? [primaryFocus] : [], strengths: [],
    developingPoints: [], unassessedPoints: Array.from({ length: unassessed }, (_, i) => ({
      knowledgePointId: `kp-u${i}`, knowledgePointName: `未评估${i}`, masteryScore: 0,
      confidence: 0, evidenceCount: 0, status: 'unassessed', priorityScore: 0.5, reasonCodes: ['NO_EVIDENCE'],
    })),
    priorityInterventions: [], evidenceSummary: null,
  } as unknown as DiagnosisResult;
}

describe('buildNextStepActions', () => {
  it('leads with the active route and skips a duplicate focus card for the same point', () => {
    const actions = buildNextStepActions({
      plan: planWithTasks([{ id: 'kp-deadlock', name: '死锁', order: 1, actionType: 'remediate' }, { id: 'kp-pv', name: 'PV 操作', order: 2 }]),
      diagnosis: diagnosisWith(focusPoint({}), 2),
    });
    expect(actions[0].key).toBe('route');
    expect(actions[0].title).toContain('死锁');
    expect(actions[0].reason).toContain('专项强化');
    expect(actions.some((action) => action.key === 'understand')).toBe(false);
    // 未评估知识点存在 → 引导自测留证据
    expect(actions.some((action) => action.key === 'assess')).toBe(true);
  });

  it('maps weak / unassessed focus points to knowledge-space actions with real reasons', () => {
    const weak = buildNextStepActions({ plan: null, diagnosis: diagnosisWith(focusPoint({ status: 'weak', masteryScore: 0.32 })) });
    expect(weak[0].key).toBe('understand');
    expect(weak[0].title).toContain('薄弱点');
    expect(weak[0].reason).toContain('32%');

    const unassessed = buildNextStepActions({ plan: null, diagnosis: diagnosisWith(focusPoint({ status: 'unassessed', masteryScore: 0 })) });
    expect(unassessed[0].title).toContain('第一层理解');
    expect(unassessed[0].reason).toContain('还没有足够的评价证据');
  });

  it('falls back to plan generation guidance when nothing exists yet', () => {
    const actions = buildNextStepActions({ plan: null, diagnosis: diagnosisWith(null) });
    expect(actions).toHaveLength(1);
    expect(actions[0].title).toContain('建立学习计划');
    expect(actions[0].to).toBe('/my-learning');
  });

  it('caps suggestions at three', () => {
    const actions = buildNextStepActions({
      plan: planWithTasks([{ id: 'kp-os', name: '进程基础', order: 1 }]),
      diagnosis: diagnosisWith(focusPoint({}), 4),
    });
    expect(actions).toHaveLength(3);
  });
});
