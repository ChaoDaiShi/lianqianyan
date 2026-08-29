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
  label: '诊断' | '计划' | '学习' | '验证';
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
}

export function selectHomePrimaryAction({
  diagnosis,
  task,
}: HomePresentationInput): HomePrimaryAction {
  if (task) return { kind: 'task', label: '继续今天的学习' };
  if (!diagnosis) return { kind: 'diagnosis', label: '开始学习诊断' };
  return { kind: 'plan', label: '生成学习计划' };
}

export function buildHomeJourney({
  diagnosis,
  plan,
  task,
  evidence,
}: HomeJourneyInput): HomeJourneyNode[] {
  const taskEvidence = task
    ? evidence.filter((item) => item.knowledgePointId === task.knowledgePointId)
    : [];
  const learningStarted = taskEvidence.some(
    (item) => item.evidenceType === 'learning_started',
  );
  const validated = taskEvidence.some(
    (item) => item.evidenceType === 'practice_answer_evaluated',
  );

  let activeIndex = 0;
  if (diagnosis) activeIndex = 1;
  if (plan && task) activeIndex = 2;
  if (learningStarted) activeIndex = 3;
  if (validated) activeIndex = 4;

  const nodes: Omit<HomeJourneyNode, 'state'>[] = [
    { id: 'diagnosis', label: '诊断', description: '看见真实起点' },
    { id: 'plan', label: '计划', description: '确定当前重点' },
    { id: 'learning', label: '学习', description: '完成一次推进' },
    { id: 'validation', label: '验证', description: '用练习留下证据' },
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
