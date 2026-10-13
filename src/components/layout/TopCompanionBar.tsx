import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { listCourses } from '@/auth/authApi';
import { LianMark } from '@/components/brand/LianMark';
import { useRecentEvidence } from '@/lib/hooks';
import { fetchLeapOverview, type LeapSession } from '@/lib/adaptiveApi';
import { useApi } from '@/lib/services';
import { useTheme } from '@/theme/ThemeProvider';

function pendingRetests(sessions: LeapSession[]) {
  return sessions.filter(
    (session) => session.retestDueAt && session.outcome?.retestScore === null,
  );
}

function retestHref(session: LeapSession) {
  const due = session.retestDueAt && Date.parse(session.retestDueAt) <= Date.now();
  return `/adaptive?session=${encodeURIComponent(session.id)}${due ? '&retest=1' : ''}`;
}

function RetestPopover({
  courseId,
  loading,
  error,
  sessions,
}: {
  courseId: string | null;
  loading: boolean;
  error: Error | null;
  sessions: LeapSession[] | null;
}) {
  const items = useMemo(() => pendingRetests(sessions ?? []), [sessions]);
  return (
    <details className="relative">
      <summary aria-label="复测提醒" className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-sm text-[var(--em-muted-ink)] hover:bg-[var(--em-primary-subtle)] hover:text-[var(--em-primary-deep)]">
        <Bell aria-hidden="true" className="h-4 w-4" />
        <span className="hidden sm:inline">复测提醒</span>
        {items.length > 0 && (
          <span className="min-w-5 rounded-full bg-amber-100 px-1.5 text-center text-xs font-semibold text-amber-900">
            {items.length}
          </span>
        )}
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4 text-[var(--em-ink)] shadow-[var(--em-shadow-lg)]">
        <h2 className="text-sm font-semibold">延迟复测</h2>
        {loading ? (
          <p className="mt-2 text-sm text-[var(--em-muted-ink)]">正在读取复测安排…</p>
        ) : error ? (
          <p role="status" className="mt-2 text-sm text-[var(--em-muted-ink)]">
            复测安排暂时无法读取。
          </p>
        ) : courseId !== 'course-ds' ? (
          <p className="mt-2 text-sm text-[var(--em-muted-ink)]">
            LEAP 延迟复测适用于数据结构课程。
          </p>
        ) : items.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--em-muted-ink)]">当前没有待复测记录。</p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--em-border)]">
            {items.map((session) => (
              <li key={session.id} className="py-2 first:pt-0 last:pb-0">
                <Link
                  to={retestHref(session)}
                  className="block rounded-md text-sm font-medium text-[var(--em-primary-deep)] hover:underline"
                >
                  {session.topicName}
                </Link>
                <p className="mt-1 text-xs text-[var(--em-muted-ink)]">
                  计划时间：{new Date(session.retestDueAt!).toLocaleDateString('zh-CN')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export function TopCompanionBar() {
  const { account, selectCourse, logout, busy } = useAuth();
  const { preference, resolved, setPreference } = useTheme();
  const courseList = useApi(listCourses, []);
  const evidence = useRecentEvidence();
  const courseId = account?.selectedCourseId ?? null;
  const courseListLoading = courseList.loading || (!courseList.data && !courseList.error);
  const retestData = useApi(
    () => account && courseId === 'course-ds'
      ? fetchLeapOverview(account.id, courseId)
      : Promise.resolve(null),
    [account?.id, courseId],
  );
  const evidenceCount = evidence.data?.filter(
    (item) => item.learnerId === account?.id && item.courseId === courseId,
  ).length;
  const evidenceLabel = evidence.loading
    ? '正在读取学习证据'
    : evidence.error
      ? '学习证据暂时无法读取'
      : `真实学习证据 ${evidenceCount ?? 0} 条`;

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-[var(--em-border)] bg-[var(--em-surface)]">
      <div className="mx-auto flex h-full max-w-[1800px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="返回学习首页">
            <LianMark size="sm" />
            <strong className="text-sm font-semibold tracking-tight text-[var(--em-ink)]">涟千言</strong>
          </Link>
          {courseListLoading && (
            <span role="status" className="text-xs text-[var(--em-muted-ink)]">正在读取课程…</span>
          )}
          {courseList.error && (
            <span role="status" className="text-xs text-[var(--em-muted-ink)]">课程列表暂时无法读取</span>
          )}
          {!courseListLoading && !courseList.error && (
            <label className="min-w-0">
              <span className="sr-only">当前课程</span>
              <select
                aria-label="当前课程"
                value={courseId ?? ''}
                disabled={busy}
                onChange={(event) => void selectCourse(event.target.value)}
                className="h-9 max-w-[12rem] rounded-md border border-[var(--em-border)] bg-[var(--em-surface)] px-2.5 text-sm text-[var(--em-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--em-focus-ring)] disabled:opacity-60 sm:max-w-[15rem]"
              >
                <option value="">请选择课程</option>
                {courseList.data?.map((course) => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <span
            role="status"
            aria-live="polite"
            className="hidden max-w-[16rem] truncate rounded-md bg-[var(--em-surface-subtle)] px-2 py-1 text-xs text-[var(--em-muted-ink)] lg:block"
          >
            {evidenceLabel}
          </span>
          <RetestPopover
            courseId={courseId}
            loading={retestData.loading || (!retestData.data && !retestData.error && courseId === 'course-ds')}
            error={retestData.error}
            sessions={retestData.data?.sessions ?? null}
          />
          <button
            type="button"
            aria-label="切换主题"
            aria-pressed={resolved === 'dark'}
            title={`当前为${resolved === 'dark' ? '深色' : '浅色'}主题；偏好：${preference}`}
            onClick={() => void setPreference(resolved === 'dark' ? 'light' : 'dark')}
            className="grid h-9 w-9 place-items-center rounded-md text-[var(--em-muted-ink)] hover:bg-[var(--em-primary-subtle)] hover:text-[var(--em-primary-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--em-focus-ring)]"
          >
            {resolved === 'dark'
              ? <Moon aria-hidden="true" className="h-4 w-4" />
              : <Sun aria-hidden="true" className="h-4 w-4" />}
          </button>
          <span className="hidden max-w-32 truncate text-sm font-medium text-[var(--em-ink)] sm:inline">
            {account?.displayName}
          </span>
          <Link
            to="/about"
            aria-label="打开关于与能力介绍"
            className="grid h-9 w-9 place-items-center rounded-md text-[var(--em-muted-ink)] hover:bg-[var(--em-primary-subtle)] hover:text-[var(--em-primary-deep)]"
          >
            <Menu aria-hidden="true" className="h-4 w-4" />
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void logout()}
            className="grid h-9 w-9 place-items-center rounded-md text-[var(--em-muted-ink)] hover:bg-[var(--em-surface-subtle)] hover:text-[var(--em-ink)] disabled:opacity-50"
            aria-label="退出登录"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
