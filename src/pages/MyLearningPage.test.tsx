import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/xiaolian/XiaolianCharacter', () => ({ XiaolianCharacter: () => <div>xiaolian-guide</div> }));
vi.mock('@/components/learning/LearningEntryDialog', () => ({ LearningEntryDialog: () => null }));
vi.mock('@/components/learning/useStartPlanTask', () => ({ useStartPlanTask: () => ({ startTask: vi.fn(), startingTaskId: null, error: null }) }));
vi.mock('@/lib/hooks', () => ({
  useCurrentPlan: () => ({ summary: null, plan: null, loading: false, error: false, refetch: vi.fn(), generate: vi.fn(), generating: false }),
  useDiagnosis: () => ({ data: null, loading: false, error: false, refetch: vi.fn() }),
  useRecentEvidence: () => ({ data: [], loading: false, error: false, refetch: vi.fn() }),
}));
vi.mock('@/store', () => ({ ACTIVE_COURSE_ID: 'course-os', ACTIVE_LEARNER_ID: 'account:user-1' }));

import { MyLearningPage } from './MyLearningPage';

describe('MyLearningPage growth route', () => {
  it('uses a compact truthful invitation when no active plan exists', () => {
    const html = renderToStaticMarkup(<MyLearningPage />);

    expect(html).toContain('我的成长路线');
    expect(html).toContain('让小涟帮我建立第一条学习路线');
    expect(html).toContain('xiaolian-guide');
    expect(html).not.toContain('小涟还没有为你生成学习计划');
    expect(html).not.toContain('生成学习计划');
  });
});
