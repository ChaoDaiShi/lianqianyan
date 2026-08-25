import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { learningRailItems, LearningRail } from './LearningRail';

interface NavLinkStubProps {
  to: string;
  children?: ReactNode | ((state: { isActive: boolean }) => ReactNode);
  className?: string | ((state: { isActive: boolean }) => string);
  'aria-label'?: string;
}

vi.mock('react-router-dom', () => ({
  NavLink: ({ to, children, className, 'aria-label': ariaLabel }: NavLinkStubProps) => {
    const state = { isActive: to === '/resources' };
    return (
      <a
        href={to}
        aria-label={ariaLabel}
        className={typeof className === 'function' ? className(state) : className}
      >
        {typeof children === 'function' ? children(state) : children}
      </a>
    );
  },
}));

describe('LearningRail assessment and workshop entries', () => {
  it('contains discoverable exam and learning workshop destinations', () => {
    expect(
      learningRailItems.filter(
        (item) => item.label === '学习工坊' && item.to === '/resources',
      ),
    ).toHaveLength(1);
    expect(
      learningRailItems.filter(
        (item) => item.label === '考试中心' && item.to === '/exams',
      ),
    ).toHaveLength(1);
    expect(learningRailItems).toHaveLength(7);
  });

  it('uses a horizontally scrollable mobile rail and keeps labels visible', () => {
    const html = renderToStaticMarkup(
      <LearningRail currentPath="/resources" />,
    );

    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('考试中心');
    expect(html).toContain('学习工坊');
    expect(html).toContain('href="/resources"');
  });
});
