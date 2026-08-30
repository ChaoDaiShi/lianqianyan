import { api } from './api';

export interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  context_used: string[];
  suggested_actions: string[];
  provider: string | null;
  model: string | null;
  created_at: string;
}

export interface CompanionMemory {
  id: string;
  content: string;
  source_message_id: string | null;
  created_at: string;
}

export interface CompanionThread {
  id: string;
  account_id: string;
  course_id: string;
  title: string;
  messages: CompanionMessage[];
  memories: CompanionMemory[];
  message_count: number;
  memory_count: number;
  created_at: string;
  updated_at: string;
}

export async function listCompanionThreads(
  courseId: string
): Promise<CompanionThread[]> {
  return (
    await api.get<CompanionThread[]>('/api/companion/threads', {
      params: { course_id: courseId },
    })
  ).data;
}

export async function createCompanionThread(
  courseId: string
): Promise<CompanionThread> {
  return (
    await api.post<CompanionThread>('/api/companion/threads', {
      course_id: courseId,
      title: '新对话',
    })
  ).data;
}

export async function appendCompanionMessage(
  threadId: string,
  message: Pick<CompanionMessage, 'role' | 'content'> &
    Partial<
      Pick<
        CompanionMessage,
        'context_used' | 'suggested_actions' | 'provider' | 'model'
      >
    >
): Promise<CompanionThread> {
  return (
    await api.post<CompanionThread>(
      `/api/companion/threads/${threadId}/messages`,
      message
    )
  ).data;
}

export async function addCompanionMemory(
  threadId: string,
  content: string,
  sourceMessageId?: string
): Promise<CompanionThread> {
  return (
    await api.post<CompanionThread>(
      `/api/companion/threads/${threadId}/memories`,
      {
        content: content.slice(0, 500),
        source_message_id: sourceMessageId ?? null,
      }
    )
  ).data;
}

export async function deleteCompanionMemory(
  threadId: string,
  memoryId: string
): Promise<CompanionThread> {
  return (
    await api.delete<CompanionThread>(
      `/api/companion/threads/${threadId}/memories/${memoryId}`
    )
  ).data;
}

export async function deleteCompanionThread(threadId: string): Promise<void> {
  await api.delete(`/api/companion/threads/${threadId}`);
}
