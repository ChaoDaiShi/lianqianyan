import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/xiaolian/CompanionPanel', () => ({ CompanionPanel: () => <aside>xiaolian-observer</aside> }));
vi.mock('@/lib/educationApi', () => ({ fetchDiagnosis: vi.fn(), fetchLearnerProfile: vi.fn() }));
vi.mock('@/store', () => ({ ACTIVE_COURSE_ID: 'course-os', ACTIVE_LEARNER_ID: 'account:user-1' }));
vi.mock('@/lib/hooks', () => ({ useCurrentPlan: () => ({ plan: null, summary: null, loading: false, error: false, refetch: vi.fn(), generate: vi.fn(), generating: false }) }));

import DiagnosisPage from './DiagnosisPage';

describe('DiagnosisPage observation space', () => {
  it('frames diagnosis as evidence observation instead of a medical report', () => {
    const html = renderToStaticMarkup(<DiagnosisPage />);

    expect(html).toContain('学习观察空间');
    expect(html).toContain('真实学习证据');
    expect(html).not.toContain('LEARNING HEALTH REPORT');
    expect(html).not.toContain('健康');
  });
});
