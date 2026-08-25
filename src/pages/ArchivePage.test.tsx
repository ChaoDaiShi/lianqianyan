import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DiagnosisResult,
  ExamAnalytics,
  LearnerProfile,
  PersistedStudyPlan,
} from '@/domain';
import type { LearningStoryTimelineProps } from '@/components/archive/LearningStoryTimeline';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import type { LearnerPortraitDashboardProps } from '@/components/profile/LearnerPortraitDashboard';
import type { MemoryCapsuleProps } from '@/components/xiaolian/MemoryCapsule';
import type { XiaolianMemoryCardProps } from '@/components/xiaolian/XiaolianMemoryCard';
import type {
  LearningEvidence,
  PracticeEvaluationResponse,
} from '@/lib/educationApi';

const fixtures = vi.hoisted(() => ({
  storyProps: null as LearningStoryTimelineProps | null,
  memoryProps: null as XiaolianMemoryCardProps | null,
  capsuleProps: null as MemoryCapsuleProps | null,
  portraitProps: null as LearnerPortraitDashboardProps | null,
  profileRefetch: vi.fn(),
  diagnosisRefetch: vi.fn(),
  planRefetch: vi.fn(),
  evidenceRefetch: vi.fn(),
  analyticsRefetch: vi.fn(),
  profile: null as LearnerProfile | null,
  diagnosis: null as DiagnosisResult | null,
  plan: null as PersistedStudyPlan | null,
  evidence: [] as LearningEvidence[],
  analytics: null as ExamAnalytics | null,
  practiceEvaluations: {} as Record<string, PracticeEvaluationResponse>,
  reflectionResults: {} as Record<string, ReflectionResult>,
  planLoading: false,
  evidenceLoading: false,
  evidenceError: true,
  analyticsLoading: false,
  analyticsError: false,
}));

vi.mock('@/components/archive/LearningIdentityCard', () => ({
  LearningIdentityCard: () => <div>learning-identity-card</div>,
}));

vi.mock('@/components/archive/LearningStoryTimeline', () => ({
  LearningStoryTimeline: (props: LearningStoryTimelineProps) => {
    fixtures.storyProps = props;
    return <div>learning-story-timeline</div>;
  },
}));

vi.mock('@/components/xiaolian/XiaolianMemoryCard', () => ({
  XiaolianMemoryCard: (props: XiaolianMemoryCardProps) => {
    fixtures.memoryProps = props;
    return <div>xiaolian-memory-card</div>;
  },
}));

vi.mock('@/components/profile/LearnerPortraitDashboard', () => ({
  LearnerPortraitDashboard: (props: LearnerPortraitDashboardProps) => {
    fixtures.portraitProps = props;
    return <div>learner-portrait-dashboard {props.profile.courseName}</div>;
  },
}));

vi.mock('@/components/xiaolian/MemoryCapsule', () => ({
  MemoryCapsule: (props: MemoryCapsuleProps) => {
    fixtures.capsuleProps = props;
    return <div>memory-capsule</div>;
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
  useExamAnalytics: () => ({
    data: fixtures.analytics,
    loading: fixtures.analyticsLoading,
    error: fixtures.analyticsError,
    refetch: fixtures.analyticsRefetch,
  }),
}));

vi.mock('@/store', () => ({
  ACTIVE_LEARNER_ID: 'learner-1',
  ACTIVE_COURSE_ID: 'course-1',
  useLearningLoopStore: (
    selector: (state: {
      practiceEvaluations: Record<string, PracticeEvaluationResponse>;
      reflectionResults: Record<string, ReflectionResult>;
    }) => unknown,
  ) =>
    selector({
      practiceEvaluations: fixtures.practiceEvaluations,
      reflectionResults: fixtures.reflectionResults,
    }),
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
  fixtures.storyProps = null;
  fixtures.memoryProps = null;
  fixtures.capsuleProps = null;
  fixtures.portraitProps = null;
  fixtures.profileRefetch.mockReset();
  fixtures.diagnosisRefetch.mockReset();
  fixtures.planRefetch.mockReset();
  fixtures.evidenceRefetch.mockReset();
  fixtures.analyticsRefetch.mockReset();
  fixtures.planLoading = false;
  fixtures.evidenceLoading = false;
  fixtures.evidenceError = true;
  fixtures.analyticsLoading = false;
  fixtures.analyticsError = false;

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
  fixtures.analytics = {
    learnerId: 'learner-1',
    courseId: 'course-1',
    submittedCount: 2,
    gradedCount: 1,
    averagePercentage: 76,
    bestPercentage: 76,
    passRate: 1,
    objectiveAccuracy: 0.75,
    pendingReviewCount: 1,
    knowledgePoints: [
      {
        knowledgePointId: 'kp-deadlock',
        knowledgePointName: 'Deadlock',
        answeredCount: 2,
        averageScoreRatio: 0.75,
      },
    ],
  };
  fixtures.practiceEvaluations = {
    'task-1': createEvaluation('practice-1', '2026-08-22T09:00:00.000Z'),
    'task-2': createEvaluation('practice-2', '2026-08-22T09:30:00.000Z'),
  };
  fixtures.reflectionResults = {
    'task-1': {
      learnerId: 'learner-1',
      courseId: 'course-1',
      taskId: 'task-1',
      knowledgePointId: 'kp-deadlock',
      knowledgePointName: 'Deadlock',
      submittedText: 'mutual exclusion',
      submittedAt: '2026-08-22T08:30:00.000Z',
      coveredConcepts: ['Mutual exclusion'],
      missingConcepts: ['Circular wait'],
      nextSuggestion: 'Review circular wait.',
    },
    'foreign-task': {
      learnerId: 'learner-2',
      courseId: 'course-1',
      taskId: 'foreign-task',
      knowledgePointId: 'kp-deadlock',
      knowledgePointName: 'Deadlock',
      submittedText: 'foreign reflection',
      submittedAt: '2026-08-22T10:30:00.000Z',
      coveredConcepts: ['Foreign concept'],
      missingConcepts: [],
      nextSuggestion: 'Foreign suggestion.',
    },
  };
});

describe('ArchivePage Xiaolian memory integration', () => {
  it('wires real profile, diagnosis, evidence, reflection, practice, and plan data', () => {
    const html = renderToStaticMarkup(<ArchivePage />);
    const storyProps = fixtures.storyProps;

    expect(html).toContain('learning-identity-card');
    expect(html).toContain('xiaolian-memory-card');
    expect(html).toContain('learner-portrait-dashboard');
    expect(html).toContain('memory-capsule');
    expect(html).toContain('learning-story-timeline');
    expect(html).not.toContain('growth-timeline');
    expect(html).toContain('Operating Systems');
    expect(html).toContain('当前星轨');
    expect(html).toContain('Deadlock');
    expect(fixtures.memoryProps?.profile).toBe(fixtures.profile);
    expect(fixtures.memoryProps?.diagnosis).toBe(fixtures.diagnosis);
    expect(fixtures.memoryProps?.evidence).toBe(fixtures.evidence);
    expect(fixtures.memoryProps?.reflectionResults).toEqual(
      [fixtures.reflectionResults['task-1']],
    );
    expect(fixtures.portraitProps?.profile).toBe(fixtures.profile);
    expect(fixtures.portraitProps?.diagnosis).toBe(fixtures.diagnosis);
    expect(fixtures.portraitProps?.analytics).toBe(fixtures.analytics);
    expect(fixtures.portraitProps?.analyticsLoading).toBe(false);
    expect(fixtures.portraitProps?.analyticsError).toBe(false);
    expect(fixtures.capsuleProps?.confirmedPreferences).toEqual([]);
    expect(storyProps).not.toBeNull();
    expect(storyProps?.plan).toBe(fixtures.plan);
    expect(storyProps?.evidence).toBe(fixtures.evidence);
    expect(storyProps?.practiceEvaluations).toEqual(
      Object.values(fixtures.practiceEvaluations),
    );
    expect(storyProps?.learnerId).toBe('learner-1');
    expect(storyProps?.courseId).toBe('course-1');
    expect(storyProps?.loading).toBe(false);
    expect(storyProps?.error).toBe(true);

    storyProps?.onRetry();

    expect(fixtures.evidenceRefetch).toHaveBeenCalledOnce();
    expect(fixtures.planRefetch).not.toHaveBeenCalled();
  });

  it('keeps exam analytics failure independent from the learning profile', () => {
    fixtures.analytics = null;
    fixtures.analyticsError = true;

    const html = renderToStaticMarkup(<ArchivePage />);

    expect(html).toContain('learner-portrait-dashboard');
    expect(fixtures.portraitProps?.analytics).toBeNull();
    expect(fixtures.portraitProps?.analyticsError).toBe(true);

    fixtures.portraitProps?.onRetryAnalytics();

    expect(fixtures.analyticsRefetch).toHaveBeenCalledOnce();
    expect(fixtures.profileRefetch).not.toHaveBeenCalled();
  });

  it('keeps the journey Evidence state independent while the Current Plan is loading', () => {
    fixtures.plan = null;
    fixtures.planLoading = true;
    fixtures.evidenceLoading = true;
    fixtures.evidenceError = false;

    const html = renderToStaticMarkup(<ArchivePage />);

    expect(html).toContain('learning-story-timeline');
    expect(html).toContain('正在读取当前学习计划');
    expect(fixtures.storyProps?.plan).toBeNull();
    expect(fixtures.storyProps?.loading).toBe(true);
    expect(fixtures.storyProps?.error).toBe(false);
  });

  it('shows an honest empty state when the real profile has no knowledge points', () => {
    if (!fixtures.profile) throw new Error('profile fixture missing');
    fixtures.profile = {
      ...fixtures.profile,
      totalKnowledgePoints: 0,
      assessedCount: 0,
      knowledgePoints: [],
    };

    renderToStaticMarkup(<ArchivePage />);

    expect(fixtures.portraitProps?.profile.knowledgePoints).toEqual([]);
  });
});
