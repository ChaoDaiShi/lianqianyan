import type { PersistedStudyPlan, PersistedStudyTask } from '@/domain';
import type { KnowledgePointContent } from '@/lib/educationApi';

export const REFLECTION_FEEDBACK_DISCLAIMER =
  '当前为前端教学反馈演示，不代表 AI 自动评分';

export const REFLECTION_PROMPTS = [
  { key: 'blindSpot', question: '本次练习中，我最初的思维盲区在哪里？' },
  { key: 'keyLogic', question: '关键转折点（如指针转移顺序）的核心逻辑是什么？' },
  { key: 'firstCheck', question: '未来遇到同类变形题时，我的第一排查步骤是什么？' },
] as const;

export type ReflectionPromptKey = (typeof REFLECTION_PROMPTS)[number]['key'];
export type ReflectionAnswers = Record<ReflectionPromptKey, string>;

export function composeReflectionAnswers(answers: ReflectionAnswers): string {
  return REFLECTION_PROMPTS
    .map(({ key }, index) => `${index + 1}. ${answers[key].trim()}`)
    .join('\n\n');
}

export type ReflectionPageStatus =
  | 'missing-id'
  | 'loading'
  | 'error'
  | 'empty'
  | 'ready';

export type ReflectionTaskStatus =
  | 'missing-task'
  | 'loading'
  | 'error'
  | 'mismatch'
  | 'ready';

export function buildReflectionHref(
  task: Pick<
    PersistedStudyTask,
    'id' | 'knowledgePointId' | 'knowledgePointName'
  >,
): string {
  return `/reflection?task_id=${encodeURIComponent(task.id)}&knowledge_point_id=${encodeURIComponent(task.knowledgePointId)}&knowledge_point_name=${encodeURIComponent(task.knowledgePointName)}`;
}

export function buildLearningSpaceHref(input: {
  taskId: string;
  knowledgePointId: string;
}): string {
  const query = [
    input.taskId
      ? `task_id=${encodeURIComponent(input.taskId)}`
      : null,
    input.knowledgePointId
      ? `knowledge_point_id=${encodeURIComponent(input.knowledgePointId)}`
      : null,
  ].filter((part): part is string => part !== null);

  return query.length > 0 ? `/space?${query.join('&')}` : '/space';
}

export function getReflectionPageStatus(input: {
  requestedKnowledgePointId: string;
  data: KnowledgePointContent | null;
  loading: boolean;
  error: boolean;
}): ReflectionPageStatus {
  if (!input.requestedKnowledgePointId) return 'missing-id';
  if (
    input.data &&
    input.data.knowledgePointId !== input.requestedKnowledgePointId
  ) {
    return 'loading';
  }
  if (input.loading && !input.data) return 'loading';
  if (input.error && !input.data) return 'error';
  if (
    !input.data ||
    !input.data.title.trim() ||
    !input.data.sections.some((section) => section.title.trim().length > 0)
  ) {
    return 'empty';
  }
  return 'ready';
}

export function getReflectionTaskStatus(input: {
  taskId: string;
  knowledgePointId: string;
  plan: PersistedStudyPlan | null;
  loading: boolean;
  error: boolean;
}): ReflectionTaskStatus {
  if (!input.taskId || !input.knowledgePointId) return 'missing-task';
  if (input.loading && !input.plan) return 'loading';
  if (input.error && !input.plan) return 'error';

  const task = input.plan?.tasks.find((item) => item.id === input.taskId);
  if (!task || task.knowledgePointId !== input.knowledgePointId) {
    return 'mismatch';
  }

  return 'ready';
}
