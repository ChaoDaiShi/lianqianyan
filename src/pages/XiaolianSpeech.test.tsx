import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/lib/hooks', () => ({
  useLlmStatus: () => ({
    data: { provider: 'unavailable', model: null, configured: false },
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
    provider: 'genie_tts',
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
  it('keeps conversation and voice primary while technical attribution is collapsed', () => {
    const html = renderToStaticMarkup(<XiaolianPage />);

    expect(html).toContain('昔涟讲解');
    expect(html).toContain('和小涟一起想明白');
    expect(html).toContain('更多');
    expect(html).toContain('技术详情');
    expect(html).toContain('语音输入');
    expect(html).toContain('语音仅填入输入框');
    expect(html).toContain('data-live2d-speaking="true"');
    expect(html).toContain('你好，我是小涟');
    expect(html).not.toContain('小涟学习工作台');
    expect(html).not.toContain('Provider：');
    expect(html).toContain('当前输出：昔涟 Genie-TTS');
    expect(html).toContain('<details');
    expect(html).not.toContain('<details open=""');
    expect(html).not.toContain('学习诊断</strong>');
  });
});
