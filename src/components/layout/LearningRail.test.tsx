// @vitest-environment jsdom

import { useState, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { learningRailItems, LearningRail } from './LearningRail';

interface NavLinkStubProps {
  to: string;
  children?: ReactNode | ((state: { isActive: boolean }) => ReactNode);
  className?: string | ((state: { isActive: boolean }) => string);
  'aria-label'?: string;
  'data-mobile-dock-item'?: string;
  'aria-current'?: string;
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

afterEach(cleanup);

function LearningRailHarness() {
  const [expanded, setExpanded] = useState(false);
  return (
    <LearningRail
      currentPath="/resources"
      expanded={expanded}
      onExpandedChange={setExpanded}
    />
  );
}

describe('LearningRail navigation', () => {
  it('keeps all registered study destinations reachable', () => {
    expect(learningRailItems.map((item) => item.to)).toEqual([
      '/',
      '/my-learning',
      '/adaptive',
      '/space',
      '/knowledge',
      '/exams',
      '/xiaolian',
      '/resources',
      '/outcome-lab',
      '/diagnosis',
      '/archive',
      '/settings',
    ]);
  });

  it('expands by keyboard-accessible control and presents the three learning stages', () => {
    render(<LearningRailHarness />);

    const toggle = screen.getByRole('button', { name: '展开导航' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: '收起导航' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.queryByText('日常闭环')).not.toBeNull();
    expect(screen.queryByText('探究与实战')).not.toBeNull();
    expect(screen.queryByText('成效与沉淀')).not.toBeNull();
    expect(document.querySelector('a[href="/space"]')).not.toBeNull();
    expect(document.querySelector('a[href="/resources"]')).not.toBeNull();
  });

  it('keeps the five-slot mobile dock and its more-entry dialog', () => {
    const { container } = render(<LearningRailHarness />);
    const html = container.innerHTML;

    expect(html).toContain('data-mobile-dock="primary"');
    expect(html.match(/data-mobile-dock-item=/g)).toHaveLength(5);
    expect(html).toContain('aria-label="和小涟聊聊"');
    expect(html).toContain('aria-label="更多学习入口"');
    expect(html).toContain('href="/resources"');
    expect(html).toContain('href="/space"');
  });

  it('moves focus into the more dialog, traps Tab, and restores focus after Escape', async () => {
    render(<LearningRailHarness />);
    const trigger = screen.getByRole('button', { name: '更多学习入口' });

    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: '更多学习入口' });
    const close = within(dialog).getByRole('button', { name: '关闭更多入口' });
    const links = within(dialog).getAllByRole('link');
    const lastLink = links[links.length - 1];

    expect(document.activeElement).toBe(close);
    lastLink.focus();
    fireEvent.keyDown(lastLink, { key: 'Tab' });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastLink);
    fireEvent.keyDown(lastLink, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '更多学习入口' })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
