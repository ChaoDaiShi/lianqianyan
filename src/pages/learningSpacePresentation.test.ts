import { describe, expect, it } from 'vitest';
import type { KnowledgePointDiagnosis } from '@/domain';
import type { PracticeEvaluationResponse } from '@/lib/educationApi';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import { selectLearningSpaceFeedback } from './learningSpacePresentation';

const diagnosis: KnowledgePointDiagnosis = {
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: 'Deadlock',
  masteryScore: 0.5,
  confidence: 0.7,
  evidenceCount: 2,
  status: 'developing',
  priorityScore: 0.6,
  reasonCodes: ['ADEQUATE_MASTERY'],
};

const reflection: ReflectionResult = {
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: 'Deadlock',
  submittedText: 'Mutual exclusion can restrict resource sharing.',
  submittedAt: '2026-08-22T10:00:00.000Z',
  coveredConcepts: ['Mutual exclusion'],
  missingConcepts: ['Circular wait'],
  nextSuggestion: 'Review circular wait.',
};

const evaluation: PracticeEvaluationResponse = {
  evidence: {
    id: 'evidence-practice-1',
    learnerId: 'learner-1',
    evidenceType: 'practice_answer_evaluated',
    source: 'learning_space',
    courseId: 'course-os',
    knowledgePointId: 'kp-deadlock',
    questionId: 'question-1',
    payload: {},
    occurredAt: '2026-08-22T10:05:00.000Z',
  },
  masteryBefore: 0.4,
  masteryAfter: 0.5,
  confidence: 0.7,
  evidenceCount: 2,
  message: 'Practice evaluation recorded.',
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

describe('selectLearningSpaceFeedback', () => {
  it('keeps reflection feedback while the available diagnosis predates practice', () => {
    expect(
      selectLearningSpaceFeedback({
        allStagesComplete: true,
        diagnosis,
        diagnosisGeneratedAt: '2026-08-22T10:04:59.999Z',
        reflectionResult: reflection,
        practiceEvaluation: evaluation,
      }),
    ).toEqual({ scenario: 'reflection_completed', result: reflection });
  });

  it('keeps practice feedback when diagnosis refresh has not produced a fresh result', () => {
    expect(
      selectLearningSpaceFeedback({
        allStagesComplete: true,
        diagnosis,
        diagnosisGeneratedAt: 'invalid',
        reflectionResult: null,
        practiceEvaluation: evaluation,
      }),
    ).toEqual({ scenario: 'practice_completed', evaluation });
  });

  it('does not treat an equal diagnosis timestamp as a demonstrated refresh', () => {
    expect(
      selectLearningSpaceFeedback({
        allStagesComplete: true,
        diagnosis,
        diagnosisGeneratedAt: evaluation.evidence.occurredAt,
        reflectionResult: reflection,
        practiceEvaluation: evaluation,
      }),
    ).toEqual({ scenario: 'reflection_completed', result: reflection });
  });

  it('shows learning completion only for diagnosis generated after practice', () => {
    expect(
      selectLearningSpaceFeedback({
        allStagesComplete: true,
        diagnosis,
        diagnosisGeneratedAt: '2026-08-22T10:05:00.001Z',
        reflectionResult: reflection,
        practiceEvaluation: evaluation,
      }),
    ).toEqual({ scenario: 'learning_completed', diagnosis });
  });
});
