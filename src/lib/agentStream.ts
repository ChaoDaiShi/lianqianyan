import {
  EventStreamContentType,
  fetchEventSource,
  type EventSourceMessage,
} from '@microsoft/fetch-event-source';
import { getRuntimeConfig } from '@/config/runtime';
import {
  mapAgentChatResponse,
  type AgentChatRequest,
  type AgentChatResponse,
  type AgentTraceItem,
} from './educationApi';

export type AgentStreamStatus =
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled';
export type AgentStreamStageState = 'active' | 'completed' | 'error';

export interface AgentStreamStage {
  stage: string;
  label: string;
  state: AgentStreamStageState;
}

export type AgentStreamEvent =
  | { type: 'status'; stage: string; label: string }
  | { type: 'trace'; item: AgentTraceItem }
  | { type: 'delta'; index: number; text: string }
  | { type: 'result'; result: AgentChatResponse }
  | { type: 'error'; message: string }
  | { type: 'done'; ok: boolean };

export interface AgentStreamState {
  status: AgentStreamStatus;
  stages: AgentStreamStage[];
  activeStage: string | null;
  activeLabel: string | null;
  text: string;
  trace: AgentTraceItem[];
  result: AgentChatResponse | null;
  error: string | null;
  complete: boolean;
}

export interface AgentStreamStartGuard {
  text: string;
  pending: boolean;
  hasActiveStream: boolean;
  threadId: string | null;
}

export function canStartAgentStream({
  text,
  pending,
  hasActiveStream,
  threadId,
}: AgentStreamStartGuard): boolean {
  return Boolean(text.trim() && threadId && !pending && !hasActiveStream);
}

export function canApplyAgentStreamUpdate(
  mounted: boolean,
  activeDraftId: string | null,
  expectedDraftId: string,
): boolean {
  return mounted && activeDraftId === expectedDraftId;
}

export function initialAgentStreamState(): AgentStreamState {
  return {
    status: 'streaming',
    stages: [],
    activeStage: null,
    activeLabel: null,
    text: '',
    trace: [],
    result: null,
    error: null,
    complete: false,
  };
}

export function cancelAgentStream(
  state: AgentStreamState,
): AgentStreamState {
  return {
    ...state,
    status: 'cancelled',
    stages: completeActiveStages(state.stages),
    activeStage: null,
    activeLabel: null,
    error: null,
    complete: false,
  };
}

function completeActiveStages(
  stages: AgentStreamStage[],
): AgentStreamStage[] {
  return stages.map((stage) =>
    stage.state === 'active' ? { ...stage, state: 'completed' } : stage,
  );
}

export function reduceAgentStream(
  state: AgentStreamState,
  event: AgentStreamEvent,
): AgentStreamState {
  switch (event.type) {
    case 'status': {
      const stages = completeActiveStages(state.stages);
      const existingIndex = stages.findIndex(
        (stage) => stage.stage === event.stage,
      );
      const next = {
        stage: event.stage,
        label: event.label,
        state: 'active' as const,
      };
      if (existingIndex >= 0) stages[existingIndex] = next;
      else stages.push(next);
      return {
        ...state,
        status: 'streaming',
        stages,
        activeStage: event.stage,
        activeLabel: event.label,
      };
    }
    case 'trace': {
      const duplicate = state.trace.some(
        (item) =>
          item.agent === event.item.agent &&
          item.name === event.item.name &&
          item.label === event.item.label &&
          item.type === event.item.type,
      );
      return {
        ...state,
        trace: duplicate ? state.trace : [...state.trace, event.item],
      };
    }
    case 'delta':
      return { ...state, status: 'streaming', text: state.text + event.text };
    case 'result':
      return {
        ...state,
        status: 'complete',
        stages: completeActiveStages(state.stages),
        activeStage: null,
        activeLabel: null,
        text: event.result.answer,
        trace: event.result.agentTrace,
        result: event.result,
        error: null,
        complete: true,
      };
    case 'error':
      return {
        ...state,
        status: 'error',
        stages: state.stages.map((stage) =>
          stage.state === 'active' ? { ...stage, state: 'error' } : stage,
        ),
        activeStage: null,
        activeLabel: null,
        error: event.message,
        complete: false,
      };
    case 'done':
      return event.ok || state.status === 'error'
        ? state
        : {
            ...state,
            status: 'error',
            error: state.error ?? '回答流在完成前中断。',
          };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('回答流返回了无效的数据。');
  }
  return value as Record<string, unknown>;
}

function requiredString(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`回答流缺少 ${key}。`);
  }
  return value;
}

function mapTraceItem(value: unknown): AgentTraceItem {
  const trace = asRecord(value);
  return {
    agent: requiredString(trace, 'agent') as AgentTraceItem['agent'],
    name: typeof trace['name'] === 'string' ? trace['name'] : null,
    label: requiredString(trace, 'label'),
    status:
      typeof trace['status'] === 'string' ? trace['status'] : 'completed',
    type: trace['type'] === 'tool' ? 'tool' : 'agent',
  };
}

export function parseAgentStreamMessage(
  eventName: string,
  data: string,
): AgentStreamEvent {
  const payload = asRecord(JSON.parse(data) as unknown);
  switch (eventName) {
    case 'status':
      return {
        type: 'status',
        stage: requiredString(payload, 'stage'),
        label: requiredString(payload, 'label'),
      };
    case 'trace':
      return { type: 'trace', item: mapTraceItem(payload['item']) };
    case 'delta':
      return {
        type: 'delta',
        index:
          typeof payload['index'] === 'number' ? payload['index'] : 0,
        text: typeof payload['text'] === 'string' ? payload['text'] : '',
      };
    case 'result':
      return { type: 'result', result: mapAgentChatResponse(payload) };
    case 'error':
      return { type: 'error', message: requiredString(payload, 'message') };
    case 'done':
      return { type: 'done', ok: payload['ok'] === true };
    default:
      throw new Error(`不支持的回答流事件：${eventName || 'message'}`);
  }
}

export function buildAgentStreamUrl(apiBaseUrl: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/api/agents/chat/stream`;
}

export interface StreamAgentChatOptions {
  signal?: AbortSignal;
  onEvent(event: AgentStreamEvent): void;
}

export async function streamAgentChat(
  request: AgentChatRequest,
  { signal, onEvent }: StreamAgentChatOptions,
): Promise<AgentChatResponse> {
  let done = false;
  let result: AgentChatResponse | null = null;
  let terminalError: Error | null = null;

  await fetchEventSource(
    buildAgentStreamUrl(getRuntimeConfig().apiBaseUrl),
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: EventStreamContentType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        learner_id: request.learnerId,
        course_id: request.courseId,
        message: request.message,
        capability: request.capability ?? null,
        thread_id: request.threadId ?? null,
        knowledge_point_id: request.knowledgePointId ?? null,
      }),
      signal,
      openWhenHidden: true,
      async onopen(response) {
        if (!response.ok) {
          let detail = `请求失败（${response.status}）`;
          try {
            const payload = (await response.json()) as { detail?: unknown };
            if (typeof payload.detail === 'string') detail = payload.detail;
          } catch {
            // Keep the sanitized status message when the body is not JSON.
          }
          throw new Error(detail);
        }
        const contentType = response.headers.get('content-type');
        if (!contentType?.startsWith(EventStreamContentType)) {
          throw new Error('服务没有返回流式回答。');
        }
      },
      onmessage(message: EventSourceMessage) {
        const event = parseAgentStreamMessage(message.event, message.data);
        if (event.type === 'result') result = event.result;
        if (event.type === 'error') terminalError = new Error(event.message);
        if (event.type === 'done') done = true;
        onEvent(event);
      },
      onclose() {
        if (!done) throw new Error('回答流在完成前中断。');
      },
      onerror(error) {
        throw error;
      },
    },
  );

  if (signal?.aborted) {
    throw new DOMException('回答已停止。', 'AbortError');
  }
  if (terminalError) throw terminalError;
  if (!done || !result) throw new Error('回答流没有返回完整结果。');
  return result;
}
