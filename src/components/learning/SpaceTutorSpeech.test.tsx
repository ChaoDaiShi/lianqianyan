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

describe('SpaceTutor digital-human speech', () => {
  it('offers speech for the assistant welcome and drives Live2D speaking state', () => {
    const html = renderToStaticMarkup(
      <SpaceTutor
        knowledgePointId="kp-deadlock"
        knowledgePointName="死锁"
      />,
    );

    expect(html).toContain('MiniMax 讲解');
    expect(html).not.toContain('Genie-TTS');
    expect(html).not.toContain('推理包');
    expect(html).toContain('语音输入');
    expect(html).toContain('data-live2d-speaking="true"');
    expect(html).toContain('你现在正在学习「死锁」');
  });
});
