// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PersistedStudyPlan } from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
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
    expect(html).toContain('从初测、方案、练习到独立验证');
    expect(html).toContain('data-journey-summary="true"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('查看记录');
    expect(html).not.toContain('开始诊断');
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
    expect(html).toContain('初测诊断');
    expect(html).toContain('方案决策');
    expect(html).toContain('针对练习');
    expect(html).toContain('独立验证');
    expect(html).not.toContain('PV 操作');
    expect(html).not.toContain('sm:grid-cols-2');
    expect(html).not.toContain('lg:grid-cols-3');
  });

  it('opens the selected stage and shows its saved source payload', () => {
    const item: LearningEvidence = {
      id: 'evidence-validation',
      learnerId: 'learner-1',
      courseId: 'course-1',
      knowledgePointId: 'kp-deadlock',
      evidenceType: 'practice_answer_evaluated',
      source: 'learning_space',
      occurredAt: '2026-10-13T09:00:00.000Z',
      payload: { score: 0.8, hintUsed: false },
    };
    render(
      <TodaysJourney
        diagnosis={null}
        plan={null}
        currentTask={null}
        evidence={[item]}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /独立验证/ }));

    expect(screen.getByRole('region', { name: '独立验证阶段记录' }).textContent).toContain(
      '"score": 0.8',
    );
  });
});
