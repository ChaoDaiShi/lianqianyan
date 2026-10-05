import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AgentStreamState } from '@/lib/agentStream';
import { StreamingResponse } from './StreamingResponse';

const activeState: AgentStreamState = {
  status: 'streaming',
  stages: [
    { stage: 'route', label: '正在理解问题', state: 'completed' },
    { stage: 'knowledge', label: '正在检索课程知识', state: 'active' },
  ],
  activeStage: 'knowledge',
  activeLabel: '正在检索课程知识',
  text: '死锁是多个进程互相等待',
  trace: [
    {
      agent: 'search_course_knowledge',
      name: 'search_course_knowledge',
      label: '课程知识检索',
      status: 'completed',
      type: 'tool',
    },
  ],
  result: null,
  error: null,
  complete: false,
};

describe('StreamingResponse', () => {
  it('shows live stages, partial text, trace, and a stop action', () => {
    const html = renderToStaticMarkup(
      <StreamingResponse
        state={activeState}
        onStop={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('data-streaming-response="active"');
    expect(html).toContain('p-5');
    expect(html).toContain('sm:p-6');
    expect(html).toContain('text-[15px]');
    expect(html).toContain('sm:text-base');
    expect(html).toContain('h-10');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('正在检索课程知识');
    expect(html).toContain('死锁是多个进程互相等待');
    expect(html).toContain('课程知识检索');
    expect(html).toContain('停止生成');
    expect(html).not.toContain('重新生成');
  });

  it('preserves partial text and offers retry after an error', () => {
    const html = renderToStaticMarkup(
      <StreamingResponse
        state={{
          ...activeState,
          status: 'error',
          activeStage: null,
          activeLabel: null,
          error: '连接暂时中断，已保留收到的内容。',
        }}
        onStop={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('data-streaming-response="error"');
    expect(html).toContain('死锁是多个进程互相等待');
    expect(html).toContain('连接暂时中断');
    expect(html).toContain('重新生成');
    expect(html).not.toContain('停止生成');
  });

  it('labels a user-cancelled response without presenting it as an error', () => {
    const html = renderToStaticMarkup(
      <StreamingResponse
        state={{
          ...activeState,
          status: 'cancelled',
          activeStage: null,
          activeLabel: null,
          error: null,
        }}
        onStop={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('data-streaming-response="cancelled"');
    expect(html).toContain('已停止生成');
    expect(html).toContain('重新生成');
    expect(html).not.toContain('连接中断');
  });
});
