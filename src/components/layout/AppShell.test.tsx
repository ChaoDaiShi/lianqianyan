// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/knowledge' }),
}));
vi.mock('@/components/design/WorkbenchBackground', () => ({
  WorkbenchBackground: () => <div data-background="workbench" />,
}));
vi.mock('@/components/design/PageTransition', () => ({
  PageTransition: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));
vi.mock('./LearningRail', () => ({
  LearningRail: ({
    expanded,
    onExpandedChange,
  }: {
    expanded: boolean;
    onExpandedChange: (expanded: boolean) => void;
  }) => (
    <nav data-rail="test" data-expanded={expanded}>
      <button type="button" onClick={() => onExpandedChange(!expanded)}>
        切换导航
      </button>
    </nav>
  ),
}));
vi.mock('./TopCompanionBar', () => ({
  TopCompanionBar: () => <header data-topbar="test" />,
}));

afterEach(cleanup);

describe('AppShell', () => {
  it('keeps the page content and companion column available', () => {
    render(
      <AppShell companion={<aside>小涟</aside>}>
        <section>课程内容</section>
      </AppShell>,
    );

    expect(screen.queryByText('课程内容')).not.toBeNull();
    expect(screen.queryByText('小涟')).not.toBeNull();
    expect(screen.queryByRole('banner')).not.toBeNull();
    expect(screen.queryByRole('navigation')).not.toBeNull();
  });

  it('hides shared chrome while rendering an immersive page', () => {
    const { container } = render(
      <AppShell immersive>
        <section>考试内容</section>
      </AppShell>,
    );

    expect(screen.queryByText('考试内容')).not.toBeNull();
    expect(screen.queryByRole('banner')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(container.querySelector('[data-background="workbench"]')).toBeNull();
  });

  it('keeps workspace rail state in sync with the shell', () => {
    const { container } = render(
      <AppShell>
        <section>课程内容</section>
      </AppShell>,
    );

    expect(container.querySelector('[data-rail][data-expanded="false"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '切换导航' }));
    expect(container.querySelector('[data-rail][data-expanded="true"]')).not.toBeNull();
  });
});
