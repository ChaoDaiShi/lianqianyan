import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock('@/lib/hooks', () => ({
  useLlmStatus: () => ({
    data: { provider: 'unavailable', model: null, configured: false },
    loading: false,
    error: false,
    refetch: vi.fn(),
  }),
  useCurrentPlan: () => ({
    summary: null,
    plan: null,
    loading: false,
    error: false,
    refetch: vi.fn(),
    generate: vi.fn(),
    generating: false,
  }),
  useKnowledgePoint: () => ({ data: null, loading: false, error: false, refetch: vi.fn() }),
  useDiagnosis: () => ({
    data: null,
    loading: false,
    error: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/components/digital-human/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({
    supported: true,
    speaking: true,
    mode: 'cyrene',
    provider: 'minimax',
    error: null,
    speak: vi.fn(),
    stop: vi.fn(),
  }),
}));

vi.mock('@/components/digital-human/useSpeechRecognition', () => ({
  useSpeechRecognition: () => ({
    supported: true,
    listening: false,
    interimTranscript: '',
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
    resetError: vi.fn(),
  }),
}));

const runtimeStore = {
  runtimeState: 'idle',
  companionState: 'companion',
  setRuntimeState: vi.fn(),
  setCompanionState: vi.fn(),
  reset: vi.fn(),
};

vi.mock('@/store', () => ({
  ACTIVE_COURSE_ID: 'course-os',
  ACTIVE_LEARNER_ID: 'anon:test-learner',
  useXiaolianRuntimeStore: (selector: (state: typeof runtimeStore) => unknown) =>
    selector(runtimeStore),
}));

import { XiaolianPage } from './XiaolianPage';

describe('XiaolianPage digital-human speech', () => {
  it('keeps the current course reading track beside a compact voice-ready dialogue track', () => {
    const html = renderToStaticMarkup(<XiaolianPage />);

    expect(html).toContain('MiniMax 讲解');
    expect(html).toContain('课程材料');
    expect(html).toContain('围绕课程材料逐步推理');
    expect(html).toContain('更多');
    expect(html).toContain('服务状态');
    expect(html).toContain('语音输入');
    expect(html).toContain('语音仅填入输入框');
    expect(html).toContain('data-live2d-speaking="true"');
    expect(html).toContain('data-live2d-framing="portrait"');
    expect(html).toContain('data-companion-size="28"');
    expect(html).toContain('你好，我是小涟');
    expect(html).toContain('data-chat-message="true"');
    expect(html).toContain('data-agent-workspace="full"');
    expect(html).toContain('aria-label="课程材料与关联知识"');
    expect(html).toContain('学习任务与路线');
    expect(html).not.toContain('小涟学习工作台');
    expect(html).not.toContain('Provider：');
    expect(html).toContain('<details');
    expect(html).not.toContain('<details open=""');
    expect(html).not.toContain('学习诊断</strong>');
  });
});
