import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { LeapRecommendation } from '@/lib/leapRecommendation';
import { HomeLeapRecommendation } from './HomeLeapRecommendation';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

describe('HomeLeapRecommendation', () => {
  it('shows the supplied reason and one primary link to the selected topic', () => {
    const recommendation: LeapRecommendation = {
      kind: 'repair',
      title: '上次独立验证仍需巩固',
      reason: '“链表”最近一次无提示验证仍显示需要巩固；从新会话开始复核。',
      actionLabel: '开始该主题的新学习',
      href: '/adaptive?topic=linked-list',
      topicId: 'linked-list',
      sessionId: null,
      evidenceCount: 3,
    };

    const html = renderToStaticMarkup(
      <HomeLeapRecommendation recommendation={recommendation} />,
    );

    expect(html).toContain('针对性学习建议');
    expect(html).toContain(recommendation.title);
    expect(html).toContain(recommendation.reason);
    expect(html).toContain('该知识点当前有 3 条有效评价证据。');
    expect(html).toContain(recommendation.actionLabel);
    expect(html).toContain('href="/adaptive?topic=linked-list"');
    expect(html.match(/<a\b/g)).toHaveLength(1);
  });
});
