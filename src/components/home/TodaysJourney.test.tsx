import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PersistedStudyPlan } from '@/domain';
import { TodaysJourney } from './TodaysJourney';

const plan: PersistedStudyPlan = {
  id: 'plan-1',
  learnerId: 'learner-1',
  courseId: 'course-1',
  status: 'active',
  strategy: 'diagnosis_driven',
  generatedAt: '2026-08-23T08:00:00.000Z',
  sourceDiagnosisGeneratedAt: '2026-08-23T07:30:00.000Z',
  reasonCodes: ['PRIMARY_FOCUS'],
  createdAt: '2026-08-23T08:00:00.000Z',
  updatedAt: '2026-08-23T08:00:00.000Z',
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
      createdAt: '2026-08-23T08:00:01.000Z',
    },
    {
      id: 'task-2',
      planId: 'plan-1',
      draftKey: 'draft-2',
      knowledgePointId: 'kp-pv',
      knowledgePointName: 'PV 操作',
      actionType: 'strengthen',
      priority: 2,
      estimatedMinutes: 15,
      reasonCodes: ['NEEDS_STRENGTHENING'],
      sourceStatus: 'developing',
      sourcePriorityScore: 0.6,
      order: 2,
      createdAt: '2026-08-23T08:00:02.000Z',
    },
  ],
};

describe('TodaysJourney', () => {
  it('presents an explicit goal choice before a learner has a plan', () => {
    const html = renderToStaticMarkup(
      <TodaysJourney
        plan={null}
        currentTaskId={null}
        loading={false}
        error={false}
        generating={false}
        starting={false}
        onGenerate={vi.fn()}
        onPrepare={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('选择学习目标');
    expect(html).toContain('请小涟生成诊断计划');
    expect(html).not.toContain('继续默认学习');
  });

  it('does not mark available CurrentPlan tasks as completed', () => {
    const html = renderToStaticMarkup(
      <TodaysJourney
        plan={plan}
        currentTaskId="task-1"
        loading={false}
        error={false}
        generating={false}
        starting={false}
        onGenerate={vi.fn()}
        onPrepare={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('PV 操作');
    expect(html).not.toContain('lucide-circle-check');
  });
});
