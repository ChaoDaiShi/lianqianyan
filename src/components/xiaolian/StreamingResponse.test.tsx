// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('正在检索课程知识');
    expect(html).toContain('死锁是多个进程互相等待');
    expect(html).toContain('课程知识检索');
    expect(html).toContain('停止生成');
    expect(html).not.toContain('重新生成');
  });

  it('stops a live stream and retries a cancelled or failed stream through their callbacks', () => {
    const onStop = vi.fn();
    const onRetry = vi.fn();
    const { rerender } = render(
      <StreamingResponse state={activeState} onStop={onStop} onRetry={onRetry} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '停止生成' }));
    expect(onStop).toHaveBeenCalledOnce();

    rerender(
      <StreamingResponse
        state={{ ...activeState, status: 'cancelled', activeStage: null, activeLabel: null }}
        onStop={onStop}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '重新生成' }));
    expect(onRetry).toHaveBeenCalledOnce();
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
