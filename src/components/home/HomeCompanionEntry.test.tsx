import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PersistedStudyPlan } from '@/domain';
import { HeroBanner } from './HeroBanner';
import { XiaolianDailyInsight } from './XiaolianDailyInsight';
import { XiaolianInsightCard } from './XiaolianInsightCard';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );

  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

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
  ],
};

describe('home companion task entries', () => {
  it('opens preparation from the hero instead of linking directly to a task space', () => {
    const html = renderToStaticMarkup(
      <HeroBanner
        profile={null}
        diagnosis={null}
        plan={plan}
        loading={false}
        error={false}
        runtimeState="idle"
        companionState="reminding"
        onPrepareTask={vi.fn()}
      />,
    );

    expect(html).toContain('开始当前任务');
    expect(html).not.toContain('/space?task_id=');
  });

  it('opens preparation from the daily insight instead of linking directly to a task space', () => {
    const html = renderToStaticMarkup(
      <XiaolianDailyInsight
        profile={null}
        diagnosis={null}
        plan={plan}
        evidence={[]}
        loading={false}
        error={false}
        onPrepareTask={vi.fn()}
      />,
    );

    expect(html).toContain('准备建议任务');
    expect(html).not.toContain('/space?task_id=');
  });

  it('keeps the legacy insight card as a plan viewer instead of a task-start bypass', () => {
    const html = renderToStaticMarkup(
      <XiaolianInsightCard
        profile={null}
        diagnosis={null}
        plan={plan}
        evidence={[]}
        loading={false}
        error={false}
      />,
    );

    expect(html).toContain('查看学习计划');
    expect(html).not.toContain('/space?task_id=');
  });
});
