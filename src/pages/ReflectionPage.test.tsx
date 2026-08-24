import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersistedStudyPlan, PersistedStudyTask } from '@/domain';
import type { ReflectionNextStepCardProps } from '@/components/learning/ReflectionNextStepCard';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import type { KnowledgePointContent } from '@/lib/educationApi';

const fixtures = vi.hoisted(() => ({
  nextStepProps: null as ReflectionNextStepCardProps | null,
  workspaceRendered: false,
  plan: null as PersistedStudyPlan | null,
  knowledge: null as KnowledgePointContent | null,
  reflectionResults: {} as Record<string, ReflectionResult>,
  setReflectionResult: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
    useSearchParams: () => [
      new URLSearchParams(
        'task_id=task-old&knowledge_point_id=kp-deadlock',
      ),
    ],
  };
});

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children?: ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/components/feedback/LearningState', () => ({
  LearningState: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/learning/LearningEntryDialog', () => ({
  LearningEntryDialog: () => <div>learning-entry-dialog</div>,
}));

vi.mock('@/components/learning/ReflectionWorkspace', () => ({
  ReflectionWorkspace: () => {
    fixtures.workspaceRendered = true;
    return <div>reflection-workspace</div>;
  },
}));

vi.mock('@/components/learning/ReflectionNextStepCard', () => ({
  ReflectionNextStepCard: (props: ReflectionNextStepCardProps) => {
    fixtures.nextStepProps = props;
    return <div>reflection-next-step-card</div>;
  },
}));

vi.mock('@/components/learning/useStartPlanTask', () => ({
  useStartPlanTask: () => ({
    startTask: vi.fn(),
    startingTaskId: null,
    error: null,
  }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/lib/hooks', () => ({
  useKnowledgePoint: () => ({
    data: fixtures.knowledge,
    loading: false,
    error: false,
    refetch: vi.fn(),
  }),
  useCurrentPlan: () => ({
    plan: fixtures.plan,
    summary: null,
    loading: false,
    error: false,
    generating: false,
    generate: vi.fn(),
    refetch: vi.fn(),
  }),
  useDiagnosis: () => ({
    data: null,
    loading: false,
    error: false,
    refetch: vi.fn(),
  }),
  useRecentEvidence: () => ({
    data: [],
    loading: false,
    error: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/store', () => ({
  DEMO_LEARNER_ID: 'learner-1',
  DEMO_COURSE_ID: 'course-1',
  useLearningLoopStore: (
    selector: (state: {
      reflectionResults: Record<string, ReflectionResult>;
      setReflectionResult: typeof fixtures.setReflectionResult;
    }) => unknown,
  ) =>
    selector({
      reflectionResults: fixtures.reflectionResults,
      setReflectionResult: fixtures.setReflectionResult,
    }),
}));

import { ReflectionPage } from './ReflectionPage';

const replannedTask: PersistedStudyTask = {
  id: 'task-new',
  planId: 'plan-new',
  draftKey: 'draft-new',
  knowledgePointId: 'kp-scheduling',
  knowledgePointName: 'Process scheduling',
  actionType: 'strengthen',
  priority: 1,
  estimatedMinutes: 15,
  reasonCodes: ['NEEDS_STRENGTHENING'],
  sourceStatus: 'developing',
  sourcePriorityScore: 0.8,
  order: 1,
  createdAt: '2026-08-23T10:30:00.000Z',
};

const storedResult: ReflectionResult = {
  learnerId: 'learner-1',
  courseId: 'course-1',
  taskId: 'task-old',
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: 'Deadlock',
  submittedText: 'Mutual exclusion and circular wait can cause deadlock.',
  submittedAt: '2026-08-23T10:00:00.000Z',
  coveredConcepts: ['Mutual exclusion'],
  missingConcepts: ['No preemption'],
  nextSuggestion: 'Review no preemption before continuing.',
};

beforeEach(() => {
  fixtures.nextStepProps = null;
  fixtures.workspaceRendered = false;
  fixtures.setReflectionResult.mockReset();
  fixtures.reflectionResults = { 'task-old': storedResult };
  fixtures.knowledge = {
    knowledgePointId: 'kp-deadlock',
    title: 'Deadlock',
    sections: [
      {
        title: 'Mutual exclusion',
        content: 'A resource can be held by only one process.',
      },
    ],
  };
  fixtures.plan = {
    id: 'plan-new',
    learnerId: 'learner-1',
    courseId: 'course-1',
    status: 'active',
    strategy: 'diagnosis_driven',
    generatedAt: '2026-08-23T10:30:00.000Z',
    sourceDiagnosisGeneratedAt: '2026-08-23T10:25:00.000Z',
    reasonCodes: ['PRIMARY_FOCUS'],
    createdAt: '2026-08-23T10:30:00.000Z',
    updatedAt: '2026-08-23T10:30:00.000Z',
    tasks: [replannedTask],
  };
});

describe('ReflectionPage', () => {
  it('keeps a semantic page heading when the reflection workspace is unavailable', () => {
    const markup = renderToStaticMarkup(<ReflectionPage />);

    expect(markup).toContain('<h1');
    expect(markup).toContain('学习复述与反思');
  });

  it('continues from a stored reflection to the first task in a replacement plan', () => {
    renderToStaticMarkup(<ReflectionPage />);

    expect(fixtures.nextStepProps?.result).toEqual(storedResult);
    expect(fixtures.nextStepProps?.nextTask).toEqual(replannedTask);
    expect(fixtures.workspaceRendered).toBe(false);
  });
});
