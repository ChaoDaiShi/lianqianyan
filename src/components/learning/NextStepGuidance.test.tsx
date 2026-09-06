import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

import { NextStepGuidance } from './NextStepGuidance';

describe('NextStepGuidance', () => {
  it('renders closed-loop actions with destinations', () => {
    const html = renderToStaticMarkup(
      <NextStepGuidance
        title="下一步 · 学习闭环"
        actions={[
          { key: 'route', title: '继续学习路线：死锁', reason: '专项强化 · 路线共 2 步', to: '/my-learning', cta: '去继续' },
          { key: 'assess', title: '用一次章节自测留下学习证据', reason: '自测结果会更新诊断与路线', to: '/exams', cta: '去做自测' },
        ]}
      />,
    );
    expect(html).toContain('data-next-step-guidance');
    expect(html).toContain('下一步 · 学习闭环');
    expect(html).toContain('href="/my-learning"');
    expect(html).toContain('去继续');
    expect(html).toContain('去做自测');
  });

  it('renders nothing when there is no suggestion', () => {
    const html = renderToStaticMarkup(<NextStepGuidance actions={[]} />);
    expect(html).toBe('');
  });
});
