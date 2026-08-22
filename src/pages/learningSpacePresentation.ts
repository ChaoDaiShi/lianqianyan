import type { ReflectionResult } from '@/components/learning/learningLoop';
import type { XiaolianFeedbackBubbleProps } from '@/components/xiaolian/XiaolianFeedbackBubble';
import type { KnowledgePointDiagnosis } from '@/domain';
import type { PracticeEvaluationResponse } from '@/lib/educationApi';

interface SelectLearningSpaceFeedbackInput {
  allStagesComplete: boolean;
  diagnosis: KnowledgePointDiagnosis | null;
  diagnosisGeneratedAt: string | null;
  reflectionResult: ReflectionResult | null;
  practiceEvaluation: PracticeEvaluationResponse | null;
}

export function selectLearningSpaceFeedback({
  allStagesComplete,
  diagnosis,
  diagnosisGeneratedAt,
  reflectionResult,
  practiceEvaluation,
}: SelectLearningSpaceFeedbackInput): XiaolianFeedbackBubbleProps | null {
  const diagnosisTime = diagnosisGeneratedAt
    ? Date.parse(diagnosisGeneratedAt)
    : Number.NaN;
  const practiceTime = practiceEvaluation
    ? Date.parse(practiceEvaluation.evidence.occurredAt)
    : Number.NaN;
  const hasFreshDiagnosis =
    diagnosis !== null &&
    practiceEvaluation !== null &&
    Number.isFinite(diagnosisTime) &&
    Number.isFinite(practiceTime) &&
    diagnosisTime > practiceTime;

  if (allStagesComplete && hasFreshDiagnosis) {
    return { scenario: 'learning_completed', diagnosis };
  }
  if (reflectionResult) {
    return { scenario: 'reflection_completed', result: reflectionResult };
  }
  if (practiceEvaluation) {
    return { scenario: 'practice_completed', evaluation: practiceEvaluation };
  }
  return null;
}
