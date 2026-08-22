import type { PersistedStudyPlan } from '@/domain';
import type {
  KnowledgePointContent,
  LearningEvidence,
  PracticeEvaluationResponse,
} from '@/lib/educationApi';

export interface ReflectionResult {
  knowledgePointId: string;
  knowledgePointName: string;
  submittedText: string;
  submittedAt: string;
  coveredConcepts: string[];
  missingConcepts: string[];
  nextSuggestion: string;
}

function normalizeConceptText(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, '');
}

export function buildReflectionResult(input: {
  knowledge: KnowledgePointContent;
  submittedText: string;
  submittedAt: string;
}): ReflectionResult {
  const concepts = input.knowledge.sections
    .map((section) => {
      const title = section.title.trim();
      return { title, normalized: normalizeConceptText(title) };
    })
    .filter((concept) => concept.title.length > 0 && concept.normalized.length > 0);
  const normalizedSubmission = normalizeConceptText(input.submittedText);
  const coveredConcepts = concepts
    .filter((concept) => normalizedSubmission.includes(concept.normalized))
    .map((concept) => concept.title);
  const missingConcepts = concepts
    .filter((concept) => !coveredConcepts.includes(concept.title))
    .map((concept) => concept.title);
  const firstMissing = missingConcepts[0];

  return {
    knowledgePointId: input.knowledge.knowledgePointId,
    knowledgePointName: input.knowledge.title,
    submittedText: input.submittedText,
    submittedAt: input.submittedAt,
    coveredConcepts,
    missingConcepts,
    nextSuggestion: firstMissing
      ? `建议回看“${firstMissing}”课程章节，再补充复述。`
      : '建议将当前复述与全部课程章节逐项对照，确认表达完整。',
  };
}

export type LearningStageStatus = 'completed' | 'current' | 'locked';

export interface LearningStageItem {
  id: 'understand' | 'explain' | 'practice' | 'reflect' | 'verify';
  label: '理解' | '讲解' | '实践' | '复述' | '验证';
  status: LearningStageStatus;
}

const LEARNING_STAGE_DEFINITIONS: Array<
  Pick<LearningStageItem, 'id' | 'label'>
> = [
  { id: 'understand', label: '理解' },
  { id: 'explain', label: '讲解' },
  { id: 'practice', label: '实践' },
  { id: 'reflect', label: '复述' },
  { id: 'verify', label: '验证' },
];

export function deriveLearningStages(input: {
  hasLearningStarted: boolean;
  hasTutorResponse: boolean;
  practiceEvaluation: PracticeEvaluationResponse | null;
  reflectionResult: ReflectionResult | null;
}): LearningStageItem[] {
  const reflectionTime = input.reflectionResult
    ? Date.parse(input.reflectionResult.submittedAt)
    : Number.NaN;
  const practiceTime = input.practiceEvaluation
    ? Date.parse(input.practiceEvaluation.evidence.occurredAt)
    : Number.NaN;
  const completed = [
    input.hasLearningStarted,
    input.hasTutorResponse,
    input.practiceEvaluation !== null,
    input.reflectionResult !== null,
    Number.isFinite(reflectionTime) &&
      Number.isFinite(practiceTime) &&
      practiceTime > reflectionTime,
  ];
  const firstUnmetIndex = completed.findIndex((isComplete) => !isComplete);

  return LEARNING_STAGE_DEFINITIONS.map((stage, index) => ({
    ...stage,
    status:
      firstUnmetIndex === -1 || index < firstUnmetIndex
        ? 'completed'
        : index === firstUnmetIndex
          ? 'current'
          : 'locked',
  }));
}

export interface LearningJourneyEvent {
  id: string;
  occurredAt: string;
  kind: 'plan' | 'plan_task' | 'learning' | 'practice';
  title: string;
  detail: string | null;
  sourceLabel: string;
}

function knowledgeName(
  knowledgePointId: string | undefined,
  knowledgeNames: Record<string, string>,
): string | null {
  if (!knowledgePointId) return null;
  return knowledgeNames[knowledgePointId] ?? knowledgePointId;
}

function eventFromEvidence(
  evidence: LearningEvidence,
  knowledgeNames: Record<string, string>,
  sourceLabel: 'LearningEvidence' | 'PracticeEvaluationResponse',
  detail: string | null = null,
): LearningJourneyEvent {
  const name = knowledgeName(evidence.knowledgePointId, knowledgeNames);
  const isPractice = evidence.evidenceType === 'practice_answer_evaluated';

  return {
    id: evidence.id,
    occurredAt: evidence.occurredAt,
    kind: isPractice ? 'practice' : 'learning',
    title: isPractice
      ? name
        ? `练习评价：${name}`
        : '练习评价'
      : name
        ? `开始学习：${name}`
        : '开始学习',
    detail,
    sourceLabel,
  };
}

function compareJourneyEvents(
  left: LearningJourneyEvent,
  right: LearningJourneyEvent,
): number {
  const leftTime = Date.parse(left.occurredAt);
  const rightTime = Date.parse(right.occurredAt);

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  const timestampOrder = right.occurredAt.localeCompare(left.occurredAt);
  return timestampOrder !== 0 ? timestampOrder : left.id.localeCompare(right.id);
}

export function buildJourneyEvents(input: {
  evidence: LearningEvidence[];
  plan: PersistedStudyPlan | null;
  practiceEvaluations: PracticeEvaluationResponse[];
  knowledgeNames: Record<string, string>;
  learnerId: string;
  courseId: string;
}): LearningJourneyEvent[] {
  const events = new Map<string, LearningJourneyEvent>();
  const matchingEvidence = input.evidence.filter(
    (item) => item.learnerId === input.learnerId && item.courseId === input.courseId,
  );

  for (const item of matchingEvidence) {
    events.set(item.id, eventFromEvidence(item, input.knowledgeNames, 'LearningEvidence'));
  }

  for (const evaluation of input.practiceEvaluations) {
    const item = evaluation.evidence;
    if (
      item.learnerId !== input.learnerId ||
      item.courseId !== input.courseId ||
      events.has(item.id)
    ) {
      continue;
    }
    events.set(
      item.id,
      eventFromEvidence(
        item,
        input.knowledgeNames,
        'PracticeEvaluationResponse',
        evaluation.message,
      ),
    );
  }

  if (
    input.plan &&
    input.plan.learnerId === input.learnerId &&
    input.plan.courseId === input.courseId
  ) {
    events.set(`plan:${input.plan.id}`, {
      id: `plan:${input.plan.id}`,
      occurredAt: input.plan.generatedAt,
      kind: 'plan',
      title: '当前学习计划生成',
      detail: `计划策略：${input.plan.strategy}`,
      sourceLabel: 'Current Plan',
    });

    for (const task of input.plan.tasks) {
      events.set(`plan-task:${task.id}`, {
        id: `plan-task:${task.id}`,
        occurredAt: task.createdAt,
        kind: 'plan_task',
        title: `计划任务：${task.knowledgePointName}`,
        detail: `计划动作：${task.actionType}`,
        sourceLabel: 'Current Plan',
      });
    }
  }

  return [...events.values()].sort(compareJourneyEvents);
}
