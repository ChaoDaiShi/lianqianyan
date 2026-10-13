// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopCompanionBar } from './TopCompanionBar';

const mocks = vi.hoisted(() => ({
  account: {
    id: 'student-1',
    displayName: '测试学生',
    selectedCourseId: 'course-ds',
  },
  selectCourse: vi.fn(),
  logout: vi.fn(),
  busy: false,
  courses: [
    { id: 'course-ds', name: '数据结构与算法', description: null },
    { id: 'course-net', name: '计算机网络', description: null },
  ],
  evidence: [] as Array<Record<string, unknown>>,
  overview: { sessions: [] } as { sessions: Array<Record<string, unknown>> },
  theme: {
    preference: 'light' as 'light' | 'dark' | 'system',
    resolved: 'light' as 'light' | 'dark',
    setPreference: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));
vi.mock('@/auth/AuthProvider', () => ({
  useAuth: () => ({
    account: mocks.account,
    selectCourse: mocks.selectCourse,
    logout: mocks.logout,
    busy: mocks.busy,
  }),
}));
vi.mock('@/auth/authApi', () => ({
  listCourses: vi.fn(),
}));
vi.mock('@/lib/services', () => ({
  useApi: (_fetcher: unknown, dependencies: unknown[] = []) =>
    dependencies.length === 0
      ? { data: mocks.courses, loading: false, error: null, refetch: vi.fn() }
      : { data: mocks.overview, loading: false, error: null, refetch: vi.fn() },
}));
vi.mock('@/lib/hooks', () => ({
  useRecentEvidence: () => ({ data: mocks.evidence, loading: false, error: false, refetch: vi.fn() }),
}));
vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => mocks.theme,
}));

afterEach(cleanup);

describe('TopCompanionBar', () => {
  beforeEach(() => {
    mocks.selectCourse.mockReset();
    mocks.logout.mockReset();
    mocks.theme.setPreference.mockReset();
    mocks.theme.resolved = 'light';
    mocks.theme.preference = 'light';
    mocks.evidence = [
      { id: 'evidence-1', learnerId: 'student-1', courseId: 'course-ds' },
      { id: 'evidence-other-course', learnerId: 'student-1', courseId: 'course-net' },
      { id: 'evidence-other-learner', learnerId: 'student-2', courseId: 'course-ds' },
    ];
    mocks.overview = {
      sessions: [
        {
          id: 'session-pending',
          topicName: '链表插入',
          retestDueAt: '2026-10-12T12:00:00Z',
          outcome: { retestScore: null },
        },
        {
          id: 'session-complete',
          topicName: '已完成复测',
          retestDueAt: '2026-10-10T12:00:00Z',
          outcome: { retestScore: 1 },
        },
      ],
    };
  });

  it('keeps the brand, account, and logout entry visible', () => {
    const html = renderToStaticMarkup(<TopCompanionBar />);

    expect(html).toContain('data-lian-mark="constellation"');
    expect(html).toContain('涟千言');
    expect(html).toContain('测试学生');
    expect(html).toContain('退出登录');
  });

  it('selects an account course through the existing auth action', () => {
    render(<TopCompanionBar />);

    fireEvent.change(screen.getByLabelText('当前课程'), {
      target: { value: 'course-net' },
    });

    expect(mocks.selectCourse).toHaveBeenCalledWith('course-net');
  });

  it('toggles the resolved theme using the existing preference store', () => {
    render(<TopCompanionBar />);

    fireEvent.click(screen.getByRole('button', { name: '切换主题' }));

    expect(mocks.theme.setPreference).toHaveBeenCalledWith('dark');
  });

  it('shows only current-account evidence and scheduled incomplete retests', () => {
    const { container } = render(<TopCompanionBar />);

    expect(screen.queryByText('真实学习证据 1 条')).not.toBeNull();
    expect(container.querySelector('summary')?.getAttribute('aria-label')).toBe('复测提醒');
    fireEvent.click(screen.getByText('复测提醒'));

    expect(screen.getByRole('link', { name: /链表插入/ }).getAttribute('href')).toBe(
      '/adaptive?session=session-pending&retest=1',
    );
    expect(screen.queryByText('已完成复测')).toBeNull();
  });
});
