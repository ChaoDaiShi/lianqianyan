import { describe, expect, it } from 'vitest';
import type {
  DiagnosisResult,
  PersistedStudyPlan,
  PersistedStudyTask,
} from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
import {
  buildHomeJourney,
  formatRetestCountdown,
  selectHomePrimaryAction,
} from './homePresentation';

const focus = {
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  masteryScore: 0.35,
  confidence: 0.72,
  evidenceCount: 2,
  status: 'weak' as const,
  priorityScore: 1,
  reasonCodes: ['LOW_MASTERY' as const],
};

const diagnosis: DiagnosisResult = {
  learnerId: 'learner-1',
  courseId: 'course-os',
  courseName: '操作系统',
  primaryFocus: focus,
  priorityInterventions: [focus],
  strengths: [],
  weakPoints: [focus],
  developingPoints: [],
  unassessedPoints: [],
  summaryCodes: ['LOW_MASTERY'],
  diagnosisGeneratedAt: '2026-08-28T08:00:00.000Z',
};

const task: PersistedStudyTask = {
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
  createdAt: '2026-08-28T08:10:00.000Z',
};

const plan: PersistedStudyPlan = {
  id: 'plan-1',
  learnerId: 'learner-1',
  courseId: 'course-os',
  status: 'active',
  strategy: 'diagnosis_driven',
  generatedAt: '2026-08-28T08:10:00.000Z',
  sourceDiagnosisGeneratedAt: diagnosis.diagnosisGeneratedAt,
  reasonCodes: ['PRIMARY_FOCUS'],
  createdAt: '2026-08-28T08:10:00.000Z',
  updatedAt: '2026-08-28T08:10:00.000Z',
  tasks: [task],
};

function evidence(
  evidenceType: LearningEvidence['evidenceType'],
): LearningEvidence {
  return {
    id: `evidence-${evidenceType}`,
    learnerId: 'learner-1',
    courseId: 'course-os',
    knowledgePointId: 'kp-deadlock',
    evidenceType,
    source:
      evidenceType === 'learning_started'
        ? 'current_study_plan'
        : 'learning_space',
    payload: {},
    occurredAt: '2026-08-28T09:00:00.000Z',
  };
}

describe('home presentation', () => {
  it('keeps first assessment open when the API returns only an unassessed diagnosis snapshot', () => {
    const emptyDiagnosis: DiagnosisResult = {
      ...diagnosis,
      primaryFocus: null,
      priorityInterventions: [], strengths: [], weakPoints: [], developingPoints: [],
      unassessedPoints: [], summaryCodes: ['NO_EVIDENCE'],
    };
    expect(buildHomeJourney({ diagnosis: emptyDiagnosis, plan: null, task: null, evidence: [] })[0].state).toBe('current');
  });
  it('chooses exactly one real next action', () => {
    expect(
      selectHomePrimaryAction({ diagnosis: null, plan: null, task: null }),
    ).toEqual({ kind: 'diagnosis', label: '开始学习诊断' });
    expect(
      selectHomePrimaryAction({ diagnosis, plan: null, task: null }),
    ).toEqual({ kind: 'plan', label: '生成学习计划' });
    expect(selectHomePrimaryAction({ diagnosis, plan, task })).toEqual({
      kind: 'task',
      label: '继续今天的学习',
    });
  });

  it('advances the journey only from matching real state and evidence', () => {
    expect(
      buildHomeJourney({ diagnosis: null, plan: null, task: null, evidence: [] })
        .map((node) => node.state),
    ).toEqual(['current', 'waiting', 'waiting', 'waiting']);

    expect(
      buildHomeJourney({ diagnosis, plan: null, task: null, evidence: [] })
        .map((node) => node.state),
    ).toEqual(['completed', 'current', 'waiting', 'waiting']);

    expect(
      buildHomeJourney({ diagnosis, plan, task, evidence: [] }).map(
        (node) => node.state,
      ),
    ).toEqual(['completed', 'completed', 'current', 'waiting']);

    expect(
      buildHomeJourney({
        diagnosis,
        plan,
        task,
        evidence: [evidence('learning_started')],
      }).map((node) => node.state),
    ).toEqual(['completed', 'completed', 'completed', 'current']);

    expect(
      buildHomeJourney({
        diagnosis,
        plan,
        task,
        evidence: [
          evidence('learning_started'),
          evidence('practice_answer_evaluated'),
        ],
      }).map((node) => node.state),
    ).toEqual(['completed', 'completed', 'completed', 'current']);

    expect(
      buildHomeJourney({
        diagnosis,
        plan,
        task,
        evidence: [
          evidence('learning_started'),
          {
            ...evidence('practice_answer_evaluated'),
            payload: { independent: true, hintUsed: false },
          },
        ],
      }).map((node) => node.state),
    ).toEqual(['completed', 'completed', 'completed', 'completed']);
  });

  it('ignores evidence from another knowledge point', () => {
    const foreign = {
      ...evidence('practice_answer_evaluated'),
      knowledgePointId: 'kp-process',
    };

    expect(
      buildHomeJourney({ diagnosis, plan, task, evidence: [foreign] }).map(
        (node) => node.state,
      ),
    ).toEqual(['completed', 'completed', 'current', 'waiting']);
  });

  it('does not treat ordinary practice feedback as an independent validation', () => {
    const guidedPractice = {
      ...evidence('practice_answer_evaluated'),
      payload: { score: 0.8, hintUsed: false },
    };

    expect(
      buildHomeJourney({
        diagnosis,
        plan,
        task,
        evidence: [evidence('learning_started'), guidedPractice],
      }).map(node => node.state),
    ).toEqual(['completed', 'completed', 'completed', 'current']);
  });

  it('formats a countdown from the server supplied retest due time', () => {
    const now = Date.parse('2026-10-13T00:00:00.000Z');

    expect(formatRetestCountdown('2026-10-15T00:00:00.000Z', now)).toBe(
      '还有 2 天到期',
    );
    expect(formatRetestCountdown('2026-10-13T00:00:00.000Z', now)).toBe(
      '已到期',
    );
  });
});
