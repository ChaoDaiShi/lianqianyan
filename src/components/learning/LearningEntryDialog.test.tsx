import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PersistedStudyPlan } from '@/domain';
import { LearningEntryDialog } from './LearningEntryDialog';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <header>{children}</header>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

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

describe('LearningEntryDialog', () => {
  it('keeps confirmation disabled until preparation data finishes loading', () => {
    const html = renderToStaticMarkup(
      <LearningEntryDialog
        open
        onOpenChange={vi.fn()}
        plan={plan}
        task={plan.tasks[0]}
        diagnosis={null}
        evidence={[]}
        dataLoading
        diagnosisError={false}
        evidenceError={false}
        onConfirm={vi.fn()}
      />,
    );

    expect(html).toContain('准备好了，开始学习');
    const confirmButton = html
      .match(/<button[^>]*>[\s\S]*?<\/button>/g)
      ?.find((button) => button.includes('准备好了，开始学习'));
    expect(confirmButton).toContain('disabled=""');
  });

  it('reports diagnosis and evidence failures independently', () => {
    const html = renderToStaticMarkup(
      <LearningEntryDialog
        open
        onOpenChange={vi.fn()}
        plan={plan}
        task={plan.tasks[0]}
        diagnosis={null}
        evidence={[]}
        diagnosisError
        evidenceError={false}
        onConfirm={vi.fn()}
      />,
    );

    expect(html).toContain('当前诊断暂时无法加载');
    expect(html).not.toContain('学习记录暂时无法加载');
  });

  it('does not report a diagnosis failure when only evidence loading fails', () => {
    const html = renderToStaticMarkup(
      <LearningEntryDialog
        open
        onOpenChange={vi.fn()}
        plan={plan}
        task={plan.tasks[0]}
        diagnosis={null}
        evidence={[]}
        diagnosisError={false}
        evidenceError
        onConfirm={vi.fn()}
      />,
    );

    expect(html).not.toContain('当前诊断暂时无法加载');
    expect(html).toContain('学习记录暂时无法加载');
  });
});
