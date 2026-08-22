import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiagnosisResult, LearnerProfile, PersistedStudyPlan } from '@/domain';
import type { LearningJourneyTimelineProps } from '@/components/archive/LearningJourneyTimeline';
import type {
  LearningEvidence,
  PracticeEvaluationResponse,
} from '@/lib/educationApi';

const fixtures = vi.hoisted(() => ({
  timelineProps: null as LearningJourneyTimelineProps | null,
  profileRefetch: vi.fn(),
  diagnosisRefetch: vi.fn(),
  planRefetch: vi.fn(),
  evidenceRefetch: vi.fn(),
  profile: null as LearnerProfile | null,
  diagnosis: null as DiagnosisResult | null,
  plan: null as PersistedStudyPlan | null,
  evidence: [] as LearningEvidence[],
  practiceEvaluations: {} as Record<string, PracticeEvaluationResponse>,
  planLoading: false,
  evidenceLoading: false,
  evidenceError: true,
}));

vi.mock('@/components/archive/LearningIdentityCard', () => ({
  LearningIdentityCard: () => <div>learning-identity-card</div>,
}));

vi.mock('@/components/archive/LearningJourneyTimeline', () => ({
  LearningJourneyTimeline: (props: LearningJourneyTimelineProps) => {
    fixtures.timelineProps = props;
    return <div>learning-journey-timeline</div>;
  },
}));

vi.mock('@/components/learning/GrowthTimeline', () => ({
  GrowthTimeline: () => <div>growth-timeline</div>,
}));

vi.mock('@/components/design/GlassPanel', () => ({
  GlassPanel: ({ children }: { children?: ReactNode }) => <section>{children}</section>,
}));

vi.mock('@/components/design/GrowthMetric', () => ({
  GrowthMetric: () => <div>growth-metric</div>,
}));

vi.mock('@/components/feedback/LearningState', () => ({
  LearningState: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children?: ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children?: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock('@/components/xiaolian/XiaolianCharacter', () => ({
  XiaolianCharacter: () => null,
}));

vi.mock('@/lib/hooks', () => ({
  useLearnerProfile: () => ({
    data: fixtures.profile,
    loading: false,
    error: false,
    refetch: fixtures.profileRefetch,
  }),
  useDiagnosis: () => ({
    data: fixtures.diagnosis,
    loading: false,
    error: false,
    refetch: fixtures.diagnosisRefetch,
  }),
  useCurrentPlan: () => ({
    plan: fixtures.plan,
    summary: null,
    loading: fixtures.planLoading,
    error: false,
    generating: false,
    generate: vi.fn(),
    refetch: fixtures.planRefetch,
  }),
  useRecentEvidence: () => ({
    data: fixtures.evidence,
    loading: fixtures.evidenceLoading,
    error: fixtures.evidenceError,
    refetch: fixtures.evidenceRefetch,
  }),
}));

vi.mock('@/store', () => ({
  DEMO_LEARNER_ID: 'learner-1',
  DEMO_COURSE_ID: 'course-1',
  useLearningLoopStore: (
    selector: (state: {
      practiceEvaluations: Record<string, PracticeEvaluationResponse>;
    }) => unknown,
  ) => selector({ practiceEvaluations: fixtures.practiceEvaluations }),
}));

import { ArchivePage } from './ArchivePage';

function createEvaluation(
  id: string,
  occurredAt: string,
): PracticeEvaluationResponse {
  return {
    evidence: {
      id,
      learnerId: 'learner-1',
      evidenceType: 'practice_answer_evaluated',
      source: 'learning_space',
      courseId: 'course-1',
      knowledgePointId: 'kp-deadlock',
      questionId: `question-${id}`,
      sessionId: 'session-1',
      payload: {},
      occurredAt,
    },
    masteryBefore: 0.4,
    masteryAfter: 0.5,
    confidence: 0.7,
    evidenceCount: 2,
    message: 'recorded',
    replanning: {
      status: 'not_needed',
      performed: false,
      reasonCodes: ['NO_MATERIAL_CHANGE'],
      previousPlanId: 'plan-1',
      newPlan: null,
      previousTopTask: null,
      newTopTask: null,
    },
  };
}

beforeEach(() => {
  fixtures.timelineProps = null;
  fixtures.profileRefetch.mockReset();
  fixtures.diagnosisRefetch.mockReset();
  fixtures.planRefetch.mockReset();
  fixtures.evidenceRefetch.mockReset();
  fixtures.planLoading = false;
  fixtures.evidenceLoading = false;
  fixtures.evidenceError = true;

  const knowledgePoint = {
    knowledgePointId: 'kp-deadlock',
    knowledgePointName: 'Deadlock',
    masteryScore: 0.4,
    confidence: 0.7,
    evidenceCount: 2,
    status: 'weak' as const,
    priorityScore: 1,
    reasonCodes: ['LOW_MASTERY' as const],
  };

  fixtures.profile = {
    learnerId: 'learner-1',
    courseId: 'course-1',
    courseName: 'Operating Systems',
    overallMastery: 0.4,
    overallConfidence: 0.7,
    insufficientData: false,
    coverage: 1,
    totalKnowledgePoints: 1,
    assessedCount: 1,
    unassessedCount: 0,
    statusCounts: {
      unassessed: 0,
      insufficient_evidence: 0,
      weak: 1,
      developing: 0,
      proficient: 0,
      mastered: 0,
    },
    knowledgePoints: [knowledgePoint],
    updatedAt: '2026-08-22T06:00:00.000Z',
  };
  fixtures.diagnosis = {
    learnerId: 'learner-1',
    courseId: 'course-1',
    courseName: 'Operating Systems',
    primaryFocus: knowledgePoint,
    priorityInterventions: [knowledgePoint],
    strengths: [],
    weakPoints: [knowledgePoint],
    developingPoints: [],
    unassessedPoints: [],
    summaryCodes: ['LOW_MASTERY'],
    diagnosisGeneratedAt: '2026-08-22T06:30:00.000Z',
  };
  fixtures.plan = {
    id: 'plan-1',
    learnerId: 'learner-1',
    courseId: 'course-1',
    status: 'active',
    strategy: 'diagnosis_driven',
    generatedAt: '2026-08-22T07:00:00.000Z',
    sourceDiagnosisGeneratedAt: '2026-08-22T06:30:00.000Z',
    reasonCodes: ['PRIMARY_FOCUS'],
    createdAt: '2026-08-22T07:00:00.000Z',
    updatedAt: '2026-08-22T07:30:00.000Z',
    tasks: [
      {
        id: 'task-1',
        planId: 'plan-1',
        draftKey: 'draft-1',
        knowledgePointId: 'kp-deadlock',
        knowledgePointName: 'Deadlock',
        actionType: 'remediate',
        priority: 1,
        estimatedMinutes: 20,
        reasonCodes: ['PRIMARY_FOCUS'],
        sourceStatus: 'weak',
        sourcePriorityScore: 1,
        order: 1,
        createdAt: '2026-08-22T07:00:01.000Z',
      },
    ],
  };
  fixtures.evidence = [
    {
      id: 'evidence-learning-1',
      learnerId: 'learner-1',
      evidenceType: 'learning_started',
      source: 'current_study_plan',
      courseId: 'course-1',
      knowledgePointId: 'kp-deadlock',
      sessionId: 'session-1',
      payload: {},
      occurredAt: '2026-08-22T08:00:00.000Z',
    },
  ];
  fixtures.practiceEvaluations = {
    'task-1': createEvaluation('practice-1', '2026-08-22T09:00:00.000Z'),
    'task-2': createEvaluation('practice-2', '2026-08-22T09:30:00.000Z'),
  };
});

describe('ArchivePage learning journey integration', () => {
  it('preserves identity and plan UI while wiring real journey inputs and Evidence retry', () => {
    const html = renderToStaticMarkup(<ArchivePage />);
    const timelineProps = fixtures.timelineProps;

    expect(html).toContain('learning-identity-card');
    expect(html).toContain('learning-journey-timeline');
    expect(html).not.toContain('growth-timeline');
    expect(html).toContain('Operating Systems');
    expect(html).toContain('当前星轨');
    expect(html).toContain('Deadlock');
    expect(timelineProps).not.toBeNull();
    expect(timelineProps?.plan).toBe(fixtures.plan);
    expect(timelineProps?.evidence).toBe(fixtures.evidence);
    expect(timelineProps?.practiceEvaluations).toEqual(
      Object.values(fixtures.practiceEvaluations),
    );
    expect(timelineProps?.learnerId).toBe('learner-1');
    expect(timelineProps?.courseId).toBe('course-1');
    expect(timelineProps?.loading).toBe(false);
    expect(timelineProps?.error).toBe(true);

    timelineProps?.onRetry();

    expect(fixtures.evidenceRefetch).toHaveBeenCalledOnce();
    expect(fixtures.planRefetch).not.toHaveBeenCalled();
  });

  it('keeps the journey Evidence state independent while the Current Plan is loading', () => {
    fixtures.plan = null;
    fixtures.planLoading = true;
    fixtures.evidenceLoading = true;
    fixtures.evidenceError = false;

    const html = renderToStaticMarkup(<ArchivePage />);

    expect(html).toContain('learning-journey-timeline');
    expect(html).toContain('正在读取当前学习计划');
    expect(fixtures.timelineProps?.plan).toBeNull();
    expect(fixtures.timelineProps?.loading).toBe(true);
    expect(fixtures.timelineProps?.error).toBe(false);
  });
});
