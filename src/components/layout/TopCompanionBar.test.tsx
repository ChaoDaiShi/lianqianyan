import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TopCompanionBar } from './TopCompanionBar';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('TopCompanionBar brand identity', () => {
  it('uses the supplied Cyrene artwork and presents her as the AI instructor', () => {
    const html = renderToStaticMarkup(<TopCompanionBar />);

    expect(html).toContain('/brand/cyrene-icon.jpeg');
    expect(html).toContain('昔涟教官');
    expect(html).not.toContain('AI 学姐');
  });
});
