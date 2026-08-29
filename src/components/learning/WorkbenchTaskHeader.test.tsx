import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PersistedStudyPlan } from '@/domain';
import { WorkbenchTaskHeader } from './WorkbenchTaskHeader';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

const plan = {
  id: 'plan-1',
  learnerId: 'learner-1',
  courseId: 'course-os',
  strategy: 'focus',
  generatedAt: '2026-08-29T00:00:00Z',
  tasks: [
    {
      id: 'task-1',
      planId: 'plan-1',
      knowledgePointId: 'kp-1',
      knowledgePointName: '进程基础',
      actionType: 'assess',
      estimatedMinutes: 15,
      order: 1,
      status: 'in_progress',
      createdAt: '2026-08-29T00:00:00Z',
    },
  ],
} as unknown as PersistedStudyPlan;

const task = plan.tasks[0];

describe('WorkbenchTaskHeader', () => {
  it('renders task context and the six learner-facing stages in one compact header', () => {
    const html = renderToStaticMarkup(
      <WorkbenchTaskHeader plan={plan} task={task} state="thinking" />,
    );

    expect(html).toContain('进程基础');
    expect(html).toContain('快速评估');
    expect(html).toContain('预计 15 分钟');
    expect(html).toContain('任务 1 / 1');
    for (const label of ['准备', '学习', '思考', '练习', '复述', '完成']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('title="阶段仅反映已观察到的学习互动，不代表掌握度"');
    expect(html).not.toContain('%');
  });

  it('marks every stage completed without showing fabricated percentages', () => {
    const html = renderToStaticMarkup(
      <WorkbenchTaskHeader plan={plan} task={task} state="complete" />,
    );

    expect(html).not.toContain('aria-current="step"');
    expect(html).toContain('完成');
    expect(html).not.toContain('%');
  });
});
