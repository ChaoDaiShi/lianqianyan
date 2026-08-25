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

describe('LearningRail workshop entry', () => {
  it('contains one discoverable learning workshop destination', () => {
    expect(
      learningRailItems.filter(
        (item) => item.label === '学习工坊' && item.to === '/resources',
      ),
    ).toHaveLength(1);
    expect(learningRailItems).toHaveLength(6);
  });

  it('uses a six-column mobile rail and keeps the workshop label visible', () => {
    const html = renderToStaticMarkup(
      <LearningRail currentPath="/resources" />,
    );

    expect(html).toContain('grid-cols-6');
    expect(html).toContain('学习工坊');
    expect(html).toContain('href="/resources"');
  });
});
