import {
  ACTION_TYPE_LABEL,
  type DiagnosisResult,
  type KnowledgePointDiagnosis,
  type PersistedStudyPlan,
  type PersistedStudyTask,
} from '@/domain';
import type {
  KnowledgePointContent,
  LearningEvidence,
} from '@/lib/educationApi';

export interface LearningEntryContent {
  knowledgePointName: string;
  diagnosisFocus: KnowledgePointDiagnosis | null;
  historicalEvidence: LearningEvidence[];
  todayGoal: string;
}

function matchingDiagnosisPoint(
  diagnosis: DiagnosisResult | null,
  knowledgePointId: string,
): KnowledgePointDiagnosis | null {
  if (!diagnosis) return null;

  const points = [
    ...(diagnosis.primaryFocus ? [diagnosis.primaryFocus] : []),
    ...diagnosis.priorityInterventions,
  ];

  return (
    points.find((point) => point.knowledgePointId === knowledgePointId) ?? null
  );
}

export function buildLearningEntryContent(input: {
  plan: PersistedStudyPlan;
  task: PersistedStudyTask;
  diagnosis: DiagnosisResult | null;
  evidence: LearningEvidence[];
}): LearningEntryContent {
  const historicalEvidence = input.evidence
    .filter(
      (item) =>
        item.learnerId === input.plan.learnerId &&
        item.courseId === input.plan.courseId &&
        item.knowledgePointId === input.task.knowledgePointId,
    )
    .sort((left, right) => {
      const leftTime = Date.parse(left.occurredAt);
      const rightTime = Date.parse(right.occurredAt);
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
        return rightTime - leftTime;
      }
      return right.occurredAt.localeCompare(left.occurredAt);
    });

  return {
    knowledgePointName: input.task.knowledgePointName,
    diagnosisFocus: matchingDiagnosisPoint(
      input.diagnosis,
      input.task.knowledgePointId,
    ),
    historicalEvidence,
    todayGoal: `${ACTION_TYPE_LABEL[input.task.actionType]}「${input.task.knowledgePointName}」，预计 ${input.task.estimatedMinutes} 分钟。`,
  };
}

export type CompanionJourneyState =
  | 'prepare'
  | 'learning'
  | 'thinking'
  | 'practice'
  | 'reflection'
  | 'complete';

export function deriveCompanionJourney(input: {
  hasLearningStarted: boolean;
  hasTutorResponse: boolean;
  tutorPending: boolean;
  hasPracticeEvaluation: boolean;
  hasReflectionResult: boolean;
  allStagesComplete: boolean;
}): CompanionJourneyState {
  if (input.allStagesComplete) return 'complete';
  if (!input.hasLearningStarted) return 'prepare';
  if (input.tutorPending) return 'thinking';
  if (!input.hasTutorResponse) return 'learning';
  if (!input.hasPracticeEvaluation) return 'practice';
  return 'reflection';
}

export interface ProactiveTeachingContent {
  title: string;
  coreConcepts: Array<{ title: string; content: string }>;
  learningFocus: { title: string; content: string };
  reminder: string;
}

export function buildProactiveTeachingContent(
  knowledge: KnowledgePointContent | null,
): ProactiveTeachingContent | null {
  if (!knowledge) return null;

  const coreConcepts = knowledge.sections
    .map((section) => ({
      title: section.title.trim(),
      content: section.content.trim(),
    }))
    .filter(
      (section) => section.title.length > 0 && section.content.length > 0,
    );

  if (coreConcepts.length === 0) return null;

  return {
    title: knowledge.title,
    coreConcepts,
    learningFocus: coreConcepts[0],
    reminder: `学习时按课程章节逐项核对：${coreConcepts
      .map((section) => section.title)
      .join('、')}。`,
  };
}

export function findNextPlanTask(
  plan: PersistedStudyPlan | null,
  currentTaskId: string,
): PersistedStudyTask | null {
  if (!plan) return null;

  const orderedTasks = [...plan.tasks].sort(
    (left, right) => left.order - right.order,
  );
  const currentIndex = orderedTasks.findIndex(
    (task) => task.id === currentTaskId,
  );

  return currentIndex >= 0
    ? orderedTasks[currentIndex + 1] ?? null
    : orderedTasks[0] ?? null;
}

export interface TodaysJourney {
  planId: string;
  tasks: Array<{
    task: PersistedStudyTask;
    state: 'current' | 'available';
  }>;
}

export function buildTodaysJourney(
  plan: PersistedStudyPlan | null,
  currentTaskId: string | null,
): TodaysJourney | null {
  if (!plan) return null;

  return {
    planId: plan.id,
    tasks: [...plan.tasks]
      .sort((left, right) => left.order - right.order)
      .map((task) => ({
        task,
        state: task.id === currentTaskId ? 'current' : 'available',
      })),
  };
}
