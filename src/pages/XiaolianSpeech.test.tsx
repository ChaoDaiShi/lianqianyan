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
  it('offers speech for assistant answers and drives Live2D speaking state', () => {
    const html = renderToStaticMarkup(<XiaolianPage />);

    expect(html).toContain('昔涟讲解');
    expect(html).toContain('当前输出：昔涟 Genie-TTS');
    expect(html).toContain('Genie-TTS 2.0.2');
    expect(html).toContain('GPT-SOVITS项目作者为花儿不哭');
    expect(html).toContain('语音输入');
    expect(html).toContain('语音仅填入输入框');
    expect(html).toContain('data-live2d-speaking="true"');
    expect(html).toContain('你好，我是小涟');
    expect(html).toContain('小涟学习工作台');
    expect(html).toContain('外部模型未配置');
    expect(html).toContain('课程材料与学习记录生成');
  });
});
