import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TopCompanionBar } from './TopCompanionBar';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock('@/auth/AuthProvider', () => ({
  useAuth: () => ({
    account: { displayName: '测试学生' },
    logout: vi.fn(),
    busy: false,
  }),
}));

describe('TopCompanionBar brand identity', () => {
  it('uses the supplied Cyrene artwork and presents Xiaolian as a senior companion', () => {
    const html = renderToStaticMarkup(<TopCompanionBar />);

    expect(html).toContain('/brand/cyrene-icon.jpeg');
    expect(html).toContain('小涟学姐');
    expect(html).not.toContain('昔涟教官');
    expect(html).toContain('测试学生');
    expect(html).toContain('退出登录');
  });
});
