import type {
  DiagnosisResult,
  PersistedStudyPlan,
  PersistedStudyTask,
} from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';

export type HomePrimaryAction = {
  kind: 'diagnosis' | 'plan' | 'task';
  label: string;
};

export type HomeJourneyState = 'completed' | 'current' | 'waiting';

export interface HomeJourneyNode {
  id: 'diagnosis' | 'plan' | 'learning' | 'validation';
  label: '初测诊断' | '方案决策' | '针对练习' | '独立验证';
  state: HomeJourneyState;
  description: string;
}

interface HomePresentationInput {
  diagnosis: DiagnosisResult | null;
  plan: PersistedStudyPlan | null;
  task: PersistedStudyTask | null;
}

interface HomeJourneyInput extends HomePresentationInput {
  evidence: LearningEvidence[];
  independentValidated?: boolean;
}

export function hasRecordedDiagnosis(diagnosis: DiagnosisResult | null): boolean {
  if (!diagnosis) return false;
  return [diagnosis.primaryFocus, ...diagnosis.priorityInterventions, ...diagnosis.strengths,
    ...diagnosis.weakPoints, ...diagnosis.developingPoints, ...diagnosis.unassessedPoints]
    .some(point => point !== null && point.evidenceCount > 0);
}

export function selectHomePrimaryAction({
  diagnosis,
  task,
}: HomePresentationInput): HomePrimaryAction {
  if (task) return { kind: 'task', label: '继续今天的学习' };
  if (!hasRecordedDiagnosis(diagnosis)) return { kind: 'diagnosis', label: '开始学习诊断' };
  return { kind: 'plan', label: '生成学习计划' };
}

export function formatRetestCountdown(dueAt: string, now: number = Date.now()) {
  const remaining = Date.parse(dueAt) - now;
  if (remaining <= 0) return '已到期';
  return `还有 ${Math.ceil(remaining / (24 * 60 * 60 * 1000))} 天到期`;
}

export function buildHomeJourney({
  diagnosis,
  plan,
  task,
  evidence,
  independentValidated = false,
}: HomeJourneyInput): HomeJourneyNode[] {
  const taskEvidence = task
    ? evidence.filter((item) => item.knowledgePointId === task.knowledgePointId)
    : [];
  const learningStarted = taskEvidence.some(
    (item) => item.evidenceType === 'learning_started',
  );
  const validated =
    independentValidated ||
    taskEvidence.some(
      item =>
        item.evidenceType === 'practice_answer_evaluated' &&
        item.payload.independent === true &&
        item.payload.hintUsed === false,
    );

  let activeIndex = 0;
  if (hasRecordedDiagnosis(diagnosis)) activeIndex = 1;
  if (plan && task) activeIndex = 2;
  if (learningStarted) activeIndex = 3;
  if (validated) activeIndex = 4;

  const nodes: Omit<HomeJourneyNode, 'state'>[] = [
    { id: 'diagnosis', label: '初测诊断', description: '定位当前理解起点' },
    { id: 'plan', label: '方案决策', description: '基于证据安排重点' },
    { id: 'learning', label: '针对练习', description: '完成计划内的学习活动' },
    { id: 'validation', label: '独立验证', description: '用新作答留下证据' },
  ];

  return nodes.map((node, index) => ({
    ...node,
    state:
      index < activeIndex
        ? 'completed'
        : index === activeIndex
          ? 'current'
          : 'waiting',
  }));
}
