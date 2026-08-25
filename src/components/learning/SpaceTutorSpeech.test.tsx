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
    speak: vi.fn(),
    stop: vi.fn(),
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

    expect(html).toContain('数字人讲解');
    expect(html).toContain('data-live2d-speaking="true"');
    expect(html).toContain('你现在正在学习「死锁」');
  });
});
