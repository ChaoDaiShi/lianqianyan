import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/lib/hooks', () => ({
  useLlmStatus: () => ({
    data: { provider: 'mock', model: null, configured: false },
    loading: false,
    error: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/components/digital-human/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({
    supported: true,
    speaking: true,
    speak: vi.fn(),
    stop: vi.fn(),
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
  DEMO_COURSE_ID: 'course-os',
  DEMO_LEARNER_ID: 'demo-user-001',
  useXiaolianRuntimeStore: (selector: (state: typeof runtimeStore) => unknown) =>
    selector(runtimeStore),
}));

import { XiaolianPage } from './XiaolianPage';

describe('XiaolianPage digital-human speech', () => {
  it('offers speech for assistant answers and drives Live2D speaking state', () => {
    const html = renderToStaticMarkup(<XiaolianPage />);

    expect(html).toContain('数字人讲解');
    expect(html).toContain('data-live2d-speaking="true"');
    expect(html).toContain('你好，我是小涟');
  });
});
