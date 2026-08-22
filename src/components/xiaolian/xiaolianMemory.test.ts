import { describe, expect, it } from 'vitest';
import type {
  DiagnosisResult,
  KnowledgePointDiagnosis,
  LearnerProfile,
  PersistedStudyPlan,
} from '@/domain';
import type {
  LearningEvidence,
  PracticeEvaluationResponse,
} from '@/lib/educationApi';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import {
  buildLearningStories,
  buildReflectionGrowthFeedback,
  buildXiaolianLearningPortrait,
  buildXiaolianMemoryObservations,
} from './xiaolianMemory';

const points: KnowledgePointDiagnosis[] = [
  {
    knowledgePointId: 'kp-deadlock',
    knowledgePointName: '死锁',
    masteryScore: 0.35,
    confidence: 0.7,
    evidenceCount: 2,
    status: 'weak',
    priorityScore: 1,
    reasonCodes: ['LOW_MASTERY'],
  },
  {
    knowledgePointId: 'kp-process',
    knowledgePointName: '进程调度',
    masteryScore: 0.86,
    confidence: 0.82,
    evidenceCount: 4,
    status: 'proficient',
    priorityScore: 0.2,
    reasonCodes: ['ADEQUATE_MASTERY'],
  },
  {
    knowledgePointId: 'kp-memory',
    knowledgePointName: '内存管理',
    masteryScore: 0,
    confidence: 0,
    evidenceCount: 0,
    status: 'unassessed',
    priorityScore: 0.5,
    reasonCodes: ['NO_EVIDENCE'],
  },
];

const profile: LearnerProfile = {
  learnerId: 'learner-1',
  courseId: 'course-1',
  courseName: '操作系统',
  overallMastery: 0.58,
  overallConfidence: 0.72,
  insufficientData: false,
  coverage: 2 / 3,
  totalKnowledgePoints: 3,
  assessedCount: 2,
  unassessedCount: 1,
  statusCounts: {
    unassessed: 1,
    insufficient_evidence: 0,
    weak: 1,
    developing: 0,
    proficient: 1,
    mastered: 0,
  },
  knowledgePoints: points,
  updatedAt: '2026-08-22T06:00:00.000Z',
};

const diagnosis: DiagnosisResult = {
  learnerId: 'learner-1',
  courseId: 'course-1',
  courseName: '操作系统',
  primaryFocus: points[0],
  priorityInterventions: [points[0]],
  strengths: [points[1]],
  weakPoints: [points[0]],
  developingPoints: [],
  unassessedPoints: [points[2]],
  summaryCodes: ['LOW_MASTERY', 'NO_EVIDENCE'],
  diagnosisGeneratedAt: '2026-08-22T06:30:00.000Z',
};

function evidence(
  id: string,
  evidenceType: LearningEvidence['evidenceType'],
  occurredAt: string,
  overrides: Partial<LearningEvidence> = {},
): LearningEvidence {
  return {
    id,
    learnerId: 'learner-1',
    evidenceType,
    source: 'learning_space',
    courseId: 'course-1',
    knowledgePointId: 'kp-deadlock',
    payload: {},
    occurredAt,
    ...overrides,
  };
}

const olderReflection: ReflectionResult = {
  learnerId: 'learner-1',
  courseId: 'course-1',
  taskId: 'task-1',
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  submittedText: '互斥条件',
  submittedAt: '2026-08-22T08:00:00.000Z',
  coveredConcepts: ['互斥条件'],
  missingConcepts: ['循环等待'],
  nextSuggestion: '建议回看“循环等待”课程章节，再补充复述。',
};

const latestReflection: ReflectionResult = {
  learnerId: 'learner-1',
  courseId: 'course-1',
  taskId: 'task-1',
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  submittedText: '互斥条件和循环等待',
  submittedAt: '2026-08-22T09:00:00.000Z',
  coveredConcepts: ['互斥条件', '循环等待'],
  missingConcepts: [],
  nextSuggestion: '建议将当前复述与全部课程章节逐项对照，确认表达完整。',
};

describe('buildXiaolianMemoryObservations', () => {
  it('uses only matching real data and selects the latest valid reflection', () => {
    const observations = buildXiaolianMemoryObservations({
      profile,
      diagnosis,
      evidence: [
        evidence('learning-1', 'learning_started', '2026-08-22T07:00:00.000Z'),
        evidence(
          'practice-1',
          'practice_answer_evaluated',
          '2026-08-22T07:30:00.000Z',
        ),
        evidence('other-learner', 'learning_started', '2026-08-22T10:00:00.000Z', {
          learnerId: 'learner-2',
        }),
        evidence('other-course', 'learning_started', '2026-08-22T10:30:00.000Z', {
          courseId: 'course-2',
        }),
      ],
      reflectionResults: [
        olderReflection,
        latestReflection,
        {
          ...latestReflection,
          learnerId: 'learner-2',
          taskId: 'other-learner-task',
          submittedText: '不属于当前学习者的复述',
          submittedAt: '2026-08-22T11:00:00.000Z',
          coveredConcepts: ['不属于当前学习者'],
        },
        {
          ...latestReflection,
          courseId: 'course-2',
          taskId: 'other-course-task',
          submittedText: '不属于当前课程的复述',
          submittedAt: '2026-08-22T12:00:00.000Z',
          coveredConcepts: ['不属于当前课程'],
        },
        {
          ...latestReflection,
          knowledgePointName: '无效时间复述',
          submittedAt: 'not-a-date',
        },
      ],
      learnerId: 'learner-1',
      courseId: 'course-1',
    });

    const text = observations.map((item) => item.text).join('\n');

    expect(text).toContain('死锁');
    expect(text).toContain('1 次开始学习');
    expect(text).toContain('1 次练习评价');
    expect(text).toContain('互斥条件、循环等待');
    expect(text).not.toContain('无效时间复述');
    expect(text).not.toContain('不属于当前学习者');
    expect(text).not.toContain('不属于当前课程');
    expect(text).not.toContain('3 次开始学习');
    expect(observations.every((item) => item.text.startsWith('小涟'))).toBe(true);
    expect(text).not.toContain('我记得你说过');
  });
});

describe('buildXiaolianLearningPortrait', () => {
  it('turns profile statuses and diagnosis focus into learner-facing language', () => {
    const portrait = buildXiaolianLearningPortrait({ profile, diagnosis });

    expect(portrait.stage).toBe('聚焦提升');
    expect(portrait.masteredDirections).toEqual([]);
    expect(portrait.strengtheningDirections).toEqual(['死锁']);
    expect(portrait.nextSuggestion).toContain('死锁');
    expect(JSON.stringify(portrait)).not.toContain('masteryScore');
  });

  it('does not claim strong directions when no strong point or focus exists', () => {
    const noFocusDiagnosis: DiagnosisResult = {
      ...diagnosis,
      primaryFocus: null,
      priorityInterventions: [],
      strengths: [],
      unassessedPoints: [],
    };
    const weakOnlyProfile: LearnerProfile = {
      ...profile,
      knowledgePoints: [points[0]],
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
    };

    const portrait = buildXiaolianLearningPortrait({
      profile: weakOnlyProfile,
      diagnosis: noFocusDiagnosis,
    });

    expect(portrait.masteredDirections).toEqual([]);
    expect(portrait.nextSuggestion).toBe('当前诊断未给出下一步优先方向。');
  });

  it('lists only MASTERED knowledge points as mastered directions', () => {
    const masteredPoint: KnowledgePointDiagnosis = {
      ...points[1],
      knowledgePointId: 'kp-mastered',
      knowledgePointName: '进程同步',
      status: 'mastered',
    };

    const portrait = buildXiaolianLearningPortrait({
      profile: {
        ...profile,
        knowledgePoints: [points[1], masteredPoint],
      },
      diagnosis,
    });

    expect(portrait.masteredDirections).toEqual(['进程同步']);
  });
});

describe('buildReflectionGrowthFeedback', () => {
  it('uses only the supplied ReflectionResult concepts and suggestion', () => {
    const feedback = buildReflectionGrowthFeedback(olderReflection);

    expect(feedback.observation).toContain('互斥条件');
    expect(feedback.observation).toContain('循环等待');
    expect(feedback.nextStep).toBe(olderReflection.nextSuggestion);
    expect(`${feedback.title}${feedback.observation}`).toContain('小涟观察到');
  });
});

describe('buildLearningStories', () => {
  it('preserves real event identity and labels plan tasks as context only', () => {
    const plan: PersistedStudyPlan = {
      id: 'plan-1',
      learnerId: 'learner-1',
      courseId: 'course-1',
      status: 'active',
      strategy: 'diagnosis_driven',
      generatedAt: '2026-08-22T06:00:00.000Z',
      sourceDiagnosisGeneratedAt: '2026-08-22T05:30:00.000Z',
      reasonCodes: ['PRIMARY_FOCUS'],
      createdAt: '2026-08-22T06:00:00.000Z',
      updatedAt: '2026-08-22T06:00:00.000Z',
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
          createdAt: '2026-08-22T06:01:00.000Z',
        },
      ],
    };
    const practiceEvidence = evidence(
      'practice-1',
      'practice_answer_evaluated',
      '2026-08-22T08:00:00.000Z',
    );
    const evaluation: PracticeEvaluationResponse = {
      evidence: practiceEvidence,
      masteryBefore: 0.35,
      masteryAfter: 0.45,
      confidence: 0.72,
      evidenceCount: 3,
      message: '本次练习评价已记录。',
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

    const stories = buildLearningStories({
      evidence: [
        evidence('learning-1', 'learning_started', '2026-08-22T07:00:00.000Z'),
        practiceEvidence,
      ],
      plan,
      practiceEvaluations: [evaluation],
      knowledgeNames: { 'kp-deadlock': '死锁' },
      learnerId: 'learner-1',
      courseId: 'course-1',
    });

    expect(stories.filter((story) => story.id === 'practice-1')).toHaveLength(1);
    expect(stories[0]).toMatchObject({
      id: 'practice-1',
      occurredAt: '2026-08-22T08:00:00.000Z',
      sourceLabel: 'LearningEvidence',
    });
    expect(stories.find((story) => story.kind === 'plan_task')).toMatchObject({
      headline: '学习计划安排了下一站',
      planContextOnly: true,
    });
    expect(stories.map((story) => story.body).join('\n')).toContain('专项强化');
    expect(stories.map((story) => story.body).join('\n')).not.toContain(
      'diagnosis_driven',
    );
    expect(stories.map((story) => story.body).join('\n')).not.toContain(
      'remediate',
    );
  });
});
