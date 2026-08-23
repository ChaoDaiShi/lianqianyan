import { describe, expect, it } from 'vitest';
import type {
  DiagnosisResult,
  PersistedStudyPlan,
  PersistedStudyTask,
} from '@/domain';
import type {
  KnowledgePointContent,
  LearningEvidence,
} from '@/lib/educationApi';
import {
  buildLearningEntryContent,
  buildProactiveTeachingContent,
  buildTodaysJourney,
  deriveCompanionJourney,
  findNextPlanTask,
} from './companionFlow';

const taskOne: PersistedStudyTask = {
  id: 'task-1',
  planId: 'plan-1',
  draftKey: 'kp-deadlock:remediate',
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  actionType: 'remediate',
  priority: 1,
  estimatedMinutes: 25,
  reasonCodes: ['PRIMARY_FOCUS'],
  sourceStatus: 'weak',
  sourcePriorityScore: 0.72,
  order: 1,
  createdAt: '2026-08-22T08:00:00.000Z',
};

const taskTwo: PersistedStudyTask = {
  ...taskOne,
  id: 'task-2',
  draftKey: 'kp-pv:strengthen',
  knowledgePointId: 'kp-pv',
  knowledgePointName: 'PV 操作',
  actionType: 'strengthen',
  reasonCodes: ['NEEDS_STRENGTHENING'],
  sourceStatus: 'developing',
  order: 2,
};

const plan: PersistedStudyPlan = {
  id: 'plan-1',
  learnerId: 'learner-1',
  courseId: 'course-os',
  status: 'active',
  strategy: 'diagnosis_driven',
  generatedAt: '2026-08-22T08:00:00.000Z',
  sourceDiagnosisGeneratedAt: '2026-08-22T07:59:00.000Z',
  reasonCodes: ['PRIMARY_FOCUS'],
  createdAt: '2026-08-22T08:00:00.000Z',
  updatedAt: '2026-08-22T08:00:00.000Z',
  tasks: [taskTwo, taskOne],
};

const diagnosis: DiagnosisResult = {
  learnerId: 'learner-1',
  courseId: 'course-os',
  courseName: '操作系统',
  primaryFocus: {
    knowledgePointId: 'kp-deadlock',
    knowledgePointName: '死锁',
    masteryScore: 0.35,
    confidence: 0.8,
    evidenceCount: 3,
    status: 'weak',
    priorityScore: 0.72,
    reasonCodes: ['LOW_MASTERY'],
  },
  priorityInterventions: [],
  strengths: [],
  weakPoints: [],
  developingPoints: [],
  unassessedPoints: [],
  summaryCodes: ['LOW_MASTERY'],
  diagnosisGeneratedAt: '2026-08-22T07:59:00.000Z',
};

function evidence(
  overrides: Partial<LearningEvidence> = {},
): LearningEvidence {
  return {
    id: 'evidence-1',
    learnerId: 'learner-1',
    evidenceType: 'learning_started',
    source: 'current_study_plan',
    courseId: 'course-os',
    knowledgePointId: 'kp-deadlock',
    sessionId: 'session-1',
    payload: {},
    occurredAt: '2026-08-22T09:00:00.000Z',
    ...overrides,
  };
}

describe('buildLearningEntryContent', () => {
  it('uses only matching diagnosis and evidence for the selected real task', () => {
    const result = buildLearningEntryContent({
      plan,
      task: taskOne,
      diagnosis,
      evidence: [
        evidence(),
        evidence({
          id: 'unrelated-knowledge',
          knowledgePointId: 'kp-pv',
          occurredAt: '2026-08-22T11:00:00.000Z',
        }),
        evidence({
          id: 'unrelated-learner',
          learnerId: 'learner-2',
          occurredAt: '2026-08-22T12:00:00.000Z',
        }),
      ],
    });

    expect(result.knowledgePointName).toBe('死锁');
    expect(result.diagnosisFocus).toMatchObject({
      knowledgePointId: 'kp-deadlock',
      knowledgePointName: '死锁',
      evidenceCount: 3,
    });
    expect(result.historicalEvidence.map((item) => item.id)).toEqual([
      'evidence-1',
    ]);
    expect(result.todayGoal).toContain('专项强化');
    expect(result.todayGoal).toContain('死锁');
    expect(result.todayGoal).toContain('25 分钟');
  });

  it('keeps history empty instead of inventing a reminder', () => {
    const result = buildLearningEntryContent({
      plan,
      task: taskTwo,
      diagnosis,
      evidence: [evidence()],
    });

    expect(result.diagnosisFocus).toBeNull();
    expect(result.historicalEvidence).toEqual([]);
  });

  it('does not label a strength or unassessed profile point as a diagnosis focus', () => {
    const profileOnlyDiagnosis: DiagnosisResult = {
      ...diagnosis,
      primaryFocus: null,
      strengths: [
        {
          ...diagnosis.primaryFocus!,
          knowledgePointId: taskTwo.knowledgePointId,
          knowledgePointName: taskTwo.knowledgePointName,
          status: 'proficient',
          reasonCodes: [],
        },
      ],
    };

    const result = buildLearningEntryContent({
      plan,
      task: taskTwo,
      diagnosis: profileOnlyDiagnosis,
      evidence: [],
    });

    expect(result.diagnosisFocus).toBeNull();
  });
});

describe('deriveCompanionJourney', () => {
  it.each([
    [
      'prepare',
      {
        hasLearningStarted: false,
        hasTutorResponse: false,
        tutorPending: false,
        hasPracticeEvaluation: false,
        hasReflectionResult: false,
        allStagesComplete: false,
      },
    ],
    [
      'learning',
      {
        hasLearningStarted: true,
        hasTutorResponse: false,
        tutorPending: false,
        hasPracticeEvaluation: false,
        hasReflectionResult: false,
        allStagesComplete: false,
      },
    ],
    [
      'thinking',
      {
        hasLearningStarted: true,
        hasTutorResponse: false,
        tutorPending: true,
        hasPracticeEvaluation: false,
        hasReflectionResult: false,
        allStagesComplete: false,
      },
    ],
    [
      'practice',
      {
        hasLearningStarted: true,
        hasTutorResponse: true,
        tutorPending: false,
        hasPracticeEvaluation: false,
        hasReflectionResult: false,
        allStagesComplete: false,
      },
    ],
    [
      'reflection',
      {
        hasLearningStarted: true,
        hasTutorResponse: true,
        tutorPending: false,
        hasPracticeEvaluation: true,
        hasReflectionResult: false,
        allStagesComplete: false,
      },
    ],
    [
      'complete',
      {
        hasLearningStarted: true,
        hasTutorResponse: true,
        tutorPending: false,
        hasPracticeEvaluation: true,
        hasReflectionResult: true,
        allStagesComplete: true,
      },
    ],
  ] as const)('derives %s from observed learning-loop facts', (expected, input) => {
    expect(deriveCompanionJourney(input)).toBe(expected);
  });
});

describe('buildProactiveTeachingContent', () => {
  it('uses only non-empty KnowledgePointContent sections', () => {
    const knowledge: KnowledgePointContent = {
      knowledgePointId: 'kp-deadlock',
      title: '死锁',
      sections: [
        { title: '互斥条件', content: '资源在同一时刻只能被一个进程占用。' },
        { title: '循环等待', content: '等待关系形成闭环。' },
        { title: '   ', content: '不应展示。' },
      ],
    };

    const result = buildProactiveTeachingContent(knowledge);

    expect(result?.coreConcepts).toEqual([
      { title: '互斥条件', content: '资源在同一时刻只能被一个进程占用。' },
      { title: '循环等待', content: '等待关系形成闭环。' },
    ]);
    expect(result?.learningFocus).toEqual({
      title: '互斥条件',
      content: '资源在同一时刻只能被一个进程占用。',
    });
    expect(result?.reminder).toContain('互斥条件');
    expect(result?.reminder).toContain('循环等待');
    expect(result?.reminder).not.toContain('关系');
  });

  it('returns null when no real course section can be displayed', () => {
    expect(
      buildProactiveTeachingContent({
        knowledgePointId: 'kp-empty',
        title: '空内容',
        sections: [{ title: ' ', content: ' ' }],
      }),
    ).toBeNull();
  });
});

describe('plan continuation helpers', () => {
  it('selects the next real task by order without mutating the plan', () => {
    expect(findNextPlanTask(plan, 'task-1')).toEqual(taskTwo);
    expect(plan.tasks).toEqual([taskTwo, taskOne]);
  });

  it('returns null at the end of the current plan', () => {
    expect(findNextPlanTask(plan, 'task-2')).toBeNull();
  });

  it('uses the first current-plan task when replanning replaced the reflected task', () => {
    expect(findNextPlanTask(plan, 'superseded-task')).toEqual(taskOne);
  });

  it('builds Today’s Journey from ordered CurrentPlan tasks', () => {
    const journey = buildTodaysJourney(plan, 'task-2');

    expect(journey?.planId).toBe('plan-1');
    expect(journey?.tasks.map((item) => item.task.id)).toEqual([
      'task-1',
      'task-2',
    ]);
    expect(journey?.tasks.map((item) => item.state)).toEqual([
      'available',
      'current',
    ]);
  });
});
