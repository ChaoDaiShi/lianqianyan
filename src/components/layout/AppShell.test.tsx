import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/knowledge' }),
}));
vi.mock('@/components/design/NebulaBackground', () => ({
  NebulaBackground: () => <div data-background="test" />,
}));
vi.mock('@/components/design/PageTransition', () => ({
  PageTransition: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));
vi.mock('./LearningRail', () => ({
  LearningRail: () => <nav data-rail="test" />,
}));
vi.mock('./TopCompanionBar', () => ({
  TopCompanionBar: () => <header data-topbar="test" />,
}));

describe('AppShell responsive workspace geometry', () => {
  it('reserves compact and expanded sidebar widths and grows the content canvas', () => {
    const html = renderToStaticMarkup(
      <AppShell>
        <section>课程内容</section>
      </AppShell>,
    );

    expect(html).toContain('data-workspace-shell="responsive"');
    expect(html).toContain('data-workspace-content="true"');
    expect(html).toContain('md:pl-[6.5rem]');
    expect(html).toContain('xl:pl-[17rem]');
    expect(html).toContain('max-w-[1600px]');
    expect(html).toContain('xl:px-10');
  });

  it('uses a wider, aligned companion column on large screens', () => {
    const html = renderToStaticMarkup(
      <AppShell companion={<aside>小涟</aside>}>
        <section>课程内容</section>
      </AppShell>,
    );

    expect(html).toContain('2xl:grid-cols-[minmax(0,1fr)_23rem]');
    expect(html).toContain('2xl:top-24');
  });
});
