import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { learningRailItems, LearningRail } from './LearningRail';

interface NavLinkStubProps {
  to: string;
  children?: ReactNode | ((state: { isActive: boolean }) => ReactNode);
  className?: string | ((state: { isActive: boolean }) => string);
  'aria-label'?: string;
  'data-mobile-dock-item'?: string;
}

vi.mock('react-router-dom', () => ({
  NavLink: ({
    to,
    children,
    className,
    'aria-label': ariaLabel,
    'data-mobile-dock-item': mobileDockItem,
  }: NavLinkStubProps) => {
    const state = { isActive: to === '/resources' };
    return (
      <a
        href={to}
        aria-label={ariaLabel}
        data-mobile-dock-item={mobileDockItem}
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
    expect(
      learningRailItems.filter((item) => item.to === '/settings'),
    ).toHaveLength(1);
    expect(
      learningRailItems.filter((item) => item.to === '/xiaolian'),
    ).toHaveLength(1);
    expect(learningRailItems).toHaveLength(9);
  });

  it('uses a five-slot mobile command dock without horizontal scrolling', () => {
    const html = renderToStaticMarkup(
      <LearningRail currentPath="/resources" />,
    );

    expect(html).toContain('data-mobile-dock="primary"');
    expect(html.match(/data-mobile-dock-item=/g)).toHaveLength(5);
    expect(html).toContain('data-mobile-dock-item="xiaolian"');
    expect(html).toContain('aria-label="和小涟聊聊"');
    expect(html).toContain('aria-label="更多学习入口"');
    expect(html).not.toContain('overflow-x-auto');
    expect(html).toContain('考试中心');
    expect(html).toContain('学习工坊');
    expect(html).toContain('href="/resources"');
  });

  it('marks the learning rail as the responsive primary navigation', () => {
    const html = renderToStaticMarkup(<LearningRail currentPath="/" />);

    expect(html).toContain('data-learning-rail="primary"');
    expect(html).toContain('data-learning-rail="desktop"');
    expect(html).toContain('data-learning-rail-mode="compact"');
    expect(html).toContain('data-learning-rail-mode="expanded"');
    expect(html).toContain('xl:w-[248px]');
    expect(html).toContain('学习星轨');
    expect(html).toContain('开始学习');
    expect(html).toContain('探索与训练');
    expect(html).toContain('记录与设置');
    expect(html).toContain('今日指挥台');
    expect(html).toContain('流式陪伴');
    expect(html).toContain('首页');
    expect(html).toContain('小涟');
    expect(html).toContain('设置');
  });
});
