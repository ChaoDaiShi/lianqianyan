import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PersistedStudyPlan } from '@/domain';
import { HeroBanner } from './HeroBanner';
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
  it('shows one diagnosis action before a diagnosis exists', () => {
    const html = renderToStaticMarkup(
      <HeroBanner
        profile={null}
        diagnosis={null}
        plan={null}
        evidence={[]}
        currentTask={null}
        loading={false}
        error={false}
        generating={false}
        runtimeState="idle"
        companionState="companion"
        onGeneratePlan={vi.fn()}
        onPrepareTask={vi.fn()}
      />,
    );

    expect(html).toContain('data-primary-action="diagnosis"');
    expect(html).toContain('开始学习诊断');
    expect(html).not.toContain('和小涟聊聊');
    expect(html).not.toContain('查看我的学习');
  });

  it('opens preparation from the hero when a real task exists', () => {
    const html = renderToStaticMarkup(
      <HeroBanner
        profile={null}
        diagnosis={null}
        plan={plan}
        evidence={[]}
        currentTask={plan.tasks[0]}
        loading={false}
        error={false}
        generating={false}
        runtimeState="idle"
        companionState="reminding"
        onGeneratePlan={vi.fn()}
        onPrepareTask={vi.fn()}
      />,
    );

    expect(html).toContain('data-primary-action="task"');
    expect(html).toContain('data-home-primary-action="true"');
    expect(html).toContain('继续今天的学习');
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
