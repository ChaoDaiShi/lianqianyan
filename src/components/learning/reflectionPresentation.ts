import type { PersistedStudyTask } from '@/domain';
import type { KnowledgePointContent } from '@/lib/educationApi';

export const REFLECTION_FEEDBACK_DISCLAIMER =
  '当前为前端教学反馈演示，不代表 AI 自动评分';

export type ReflectionPageStatus =
  | 'missing-id'
  | 'loading'
  | 'error'
  | 'empty'
  | 'ready';

export function buildReflectionHref(
  task: Pick<
    PersistedStudyTask,
    'id' | 'knowledgePointId' | 'knowledgePointName'
  >,
): string {
  return `/reflection?task_id=${encodeURIComponent(task.id)}&knowledge_point_id=${encodeURIComponent(task.knowledgePointId)}&knowledge_point_name=${encodeURIComponent(task.knowledgePointName)}`;
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
