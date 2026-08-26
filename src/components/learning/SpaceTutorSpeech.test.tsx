import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SpaceTutor } from './SpaceTutor';

vi.mock('@/lib/hooks', () => ({
  useAgentChat: () => ({ send: vi.fn(), pending: false }),
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

describe('SpaceTutor digital-human speech', () => {
  it('offers speech for the assistant welcome and drives Live2D speaking state', () => {
    const html = renderToStaticMarkup(
      <SpaceTutor
        knowledgePointId="kp-deadlock"
        knowledgePointName="死锁"
      />,
    );

    expect(html).toContain('昔涟讲解');
    expect(html).toContain('当前输出：昔涟 Genie-TTS');
    expect(html).toContain('推理包作者为红血球AE3803和白菜工厂1145号员工');
    expect(html).toContain('语音输入');
    expect(html).toContain('data-live2d-speaking="true"');
    expect(html).toContain('你现在正在学习「死锁」');
  });
});
