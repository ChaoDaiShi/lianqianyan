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
  it('presents diagnosis as the next path node without a second CTA', () => {
    const html = renderToStaticMarkup(
      <TodaysJourney
        diagnosis={null}
        plan={null}
        currentTask={null}
        evidence={[]}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('data-journey-node="diagnosis"');
    expect(html).toContain('data-journey-state="current"');
    expect(html).toContain('今天从第一次诊断开始');
    expect(html).toContain('尚未安排');
    expect(html).toContain('--');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('继续默认学习');
  });

  it('renders one connected semantic path instead of plan task cards', () => {
    const html = renderToStaticMarkup(
      <TodaysJourney
        diagnosis={{
          learnerId: 'learner-1',
          courseId: 'course-1',
          courseName: '操作系统',
          primaryFocus: null,
          priorityInterventions: [],
          strengths: [],
          weakPoints: [],
          developingPoints: [],
          unassessedPoints: [],
          summaryCodes: [],
          diagnosisGeneratedAt: '2026-08-23T07:30:00.000Z',
        }}
        plan={plan}
        currentTask={plan.tasks[0]}
        evidence={[]}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(html.match(/data-journey-node=/g)).toHaveLength(4);
    expect(html).toContain('诊断');
    expect(html).toContain('计划');
    expect(html).toContain('学习');
    expect(html).toContain('验证');
    expect(html).not.toContain('PV 操作');
    expect(html).not.toContain('sm:grid-cols-2');
    expect(html).not.toContain('lg:grid-cols-3');
  });
});
