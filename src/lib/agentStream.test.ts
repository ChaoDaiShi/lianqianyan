import { describe, expect, it } from 'vitest';
import type { AgentChatResponse } from './educationApi';
import {
  buildAgentStreamUrl,
  cancelAgentStream,
  initialAgentStreamState,
  parseAgentStreamMessage,
  reduceAgentStream,
  type AgentStreamEvent,
} from './agentStream';

const completedResponse: AgentChatResponse = {
  answer: '先理解死锁的四个必要条件。',
  selectedCapability: 'tutoring',
  provider: 'unavailable',
  model: null,
  responseMode: 'fallback',
  sources: [
    {
      id: 'chunk-1',
      title: '死锁',
      section: '必要条件',
      knowledgePointId: 'kp-deadlock',
      excerpt: '互斥、请求并保持、不可抢占、循环等待。',
    },
  ],
  contextUsed: ['course_knowledge'],
  suggestedActions: [{ type: 'continue_learning', label: '完成死锁练习' }],
  agentTrace: [
    {
      agent: 'search_course_knowledge',
      name: 'search_course_knowledge',
      label: '课程知识检索',
      status: 'completed',
      type: 'tool',
    },
    {
      agent: 'tutoring',
      name: null,
      label: '小涟辅导',
      status: 'completed',
      type: 'agent',
    },
  ],
};

describe('agent stream state', () => {
  it('merges deltas and replaces metadata with the authoritative result', () => {
    const events: AgentStreamEvent[] = [
      { type: 'status', stage: 'route', label: '正在理解问题' },
      { type: 'delta', index: 0, text: '先理解死锁的' },
      { type: 'delta', index: 1, text: '四个必要条件。' },
      { type: 'result', result: completedResponse },
      { type: 'done', ok: true },
    ];

    const state = events.reduce(reduceAgentStream, initialAgentStreamState());

    expect(state.text).toBe(completedResponse.answer);
    expect(state.result).toEqual(completedResponse);
    expect(state.complete).toBe(true);
    expect(state.status).toBe('complete');
  });

  it('keeps received text and trace when the stream reports an error', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'trace',
        item: completedResponse.agentTrace[0],
      },
      { type: 'delta', index: 0, text: '已收到的部分回答' },
      { type: 'error', message: '小涟暂时无法完成回答，请稍后重试。' },
      { type: 'done', ok: false },
    ];

    const state = events.reduce(reduceAgentStream, initialAgentStreamState());

    expect(state.text).toBe('已收到的部分回答');
    expect(state.trace).toEqual([completedResponse.agentTrace[0]]);
    expect(state.status).toBe('error');
    expect(state.error).toContain('暂时无法完成');
  });

  it('marks a user stop as cancelled while preserving partial text', () => {
    const partial = reduceAgentStream(initialAgentStreamState(), {
      type: 'delta',
      index: 0,
      text: '已经生成的部分',
    });

    const cancelled = cancelAgentStream(partial);

    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.text).toBe('已经生成的部分');
    expect(cancelled.error).toBeNull();
    expect(cancelled.complete).toBe(false);
  });
});

describe('agent stream wire format', () => {
  it('maps snake-case result payloads through the shared agent response mapper', () => {
    const event = parseAgentStreamMessage(
      'result',
      JSON.stringify({
        answer: completedResponse.answer,
        selected_capability: 'tutoring',
        provider: 'unavailable',
        model: null,
        response_mode: 'fallback',
        sources: [
          {
            id: 'chunk-1',
            title: '死锁',
            section: '必要条件',
            knowledge_point_id: 'kp-deadlock',
            excerpt: '课程来源',
          },
        ],
        context_used: ['course_knowledge'],
        suggested_actions: [{ type: 'continue_learning', label: '继续学习' }],
        agent_trace: [
          {
            agent: 'tutoring',
            name: null,
            label: '小涟辅导',
            status: 'completed',
            type: 'agent',
          },
        ],
      }),
    );

    expect(event).toMatchObject({
      type: 'result',
      result: {
        selectedCapability: 'tutoring',
        responseMode: 'fallback',
        contextUsed: ['course_knowledge'],
      },
    });
  });

  it('builds same-origin and configured API stream URLs without duplicate slashes', () => {
    expect(buildAgentStreamUrl('')).toBe('/api/agents/chat/stream');
    expect(buildAgentStreamUrl('https://learning.example.com/')).toBe(
      'https://learning.example.com/api/agents/chat/stream',
    );
  });
});
