import { ArrowRight, BookOpenCheck, RotateCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi } from '@/lib/services';
import { fetchLeapOverview } from '@/lib/adaptiveApi';
import type { LeapSession } from '@/lib/adaptiveApi';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';

function latestSession(sessions: LeapSession[]) {
  const ordered = [...sessions].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return ordered.find((session) => session.phase !== 'completed') ?? ordered[0] ?? null;
}

function phaseLabel(phase: LeapSession['phase']) {
  return { diagnostic: '前测', decision: '策略决策', teaching: '教学中', probe: '独立探测', completed: '已完成' }[phase];
}

function misconceptionStatusLabel(status: NonNullable<LeapSession['outcome']>['misconceptionStatus']) {
  return { repaired: '已修复', persisting: '仍存在', uncertain: '待确认' }[status];
}

function formatScore(score: number) {
  return `${Math.round(score * 100)}%`;
}

export function LeapEntryCard({
  learnerId = ACTIVE_LEARNER_ID,
  courseId = ACTIVE_COURSE_ID,
  compact = false,
}: {
  learnerId?: string;
  courseId?: string;
  compact?: boolean;
}) {
  const isDataStructure = courseId === 'course-ds';
  const overview = useApi(
    () => isDataStructure ? fetchLeapOverview(learnerId, courseId) : Promise.resolve(null),
    [isDataStructure, learnerId, courseId],
  );
  const current = overview.data ? latestSession(overview.data.sessions) : null;
  const active = current !== null && current.phase !== 'completed';
  const destination = current
    ? `/adaptive?session=${encodeURIComponent(current.id)}`
    : '/adaptive';

  return (
    <section className={`rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] shadow-[var(--em-shadow-sm)] ${compact ? 'p-4' : 'p-5 sm:p-6'}`} aria-label="LEAP 自适应学习">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--em-primary-subtle)] text-[var(--em-primary-deep)]"><BookOpenCheck className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[var(--em-primary-deep)]">LEAP · DATA STRUCTURES</p>
          <h2 className="mt-1 text-base font-bold">让学习证据决定下一步</h2>
          {!isDataStructure ? (
            <>
              <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">从数据结构课程开始，体验误解诊断、针对性教学与独立验证。</p>
              <Link to="/adaptive" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--em-primary-deep)] hover:underline">前往数据结构课程入口 <ArrowRight className="h-3 w-3" /></Link>
            </>
          ) : (overview.loading || (!overview.data && !overview.error)) ? (
            <p className="mt-2 text-xs text-[var(--em-muted-ink)]">正在读取当前课程的 LEAP 学习记录…</p>
          ) : overview.error && !overview.data ? (
            <div className="mt-2">
              <p role="status" className="text-xs leading-5 text-amber-800">LEAP 学习记录暂时无法读取。</p>
              <button type="button" onClick={() => void overview.refetch()} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--em-primary-deep)] hover:underline"><RotateCw className="h-3 w-3" />重新加载</button>
            </div>
          ) : current ? (
            <>
              <p className="mt-2 text-xs font-semibold text-[var(--em-ink)]">{active ? '有一条学习记录可以继续' : '最近一次记录已完成' } · {current.topicName}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">
                {current.decision?.reason ?? current.diagnosis?.reason ?? `当前阶段：${phaseLabel(current.phase)}；已记录 ${current.evidence.length} 条学习证据。`}
              </p>
              {current.outcome ? <p className="mt-1 text-xs text-[var(--em-ink)]">无提示独立后测：{current.outcome.independent && !current.outcome.hintUsed ? '是' : '否'} · 得分 {formatScore(current.outcome.score)} · 误解{misconceptionStatusLabel(current.outcome.misconceptionStatus)}</p> : null}
              <Link to={destination} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--em-action)] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--em-action-hover)]">{active ? '继续 LEAP 学习' : '查看本次结果'} <ArrowRight className="h-3.5 w-3.5" /></Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">先用一道短题找到理解中的卡点，再由小涟推荐适合你的学习方式。</p>
              <Link to="/adaptive" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--em-action)] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--em-action-hover)]"><BookOpenCheck className="h-3.5 w-3.5" />开始数据结构诊断 <ArrowRight className="h-3.5 w-3.5" /></Link>
            </>
          )}
        </div>
      </div>
      {isDataStructure && overview.data ? <p className="mt-3 border-t border-[var(--em-border)] pt-3 text-[10px] leading-4 text-[var(--em-muted-ink)]">已读取 {overview.data.stats.totalSessions} 次会话 · {overview.data.stats.completedSessions} 次完成</p> : null}
    </section>
  );
}
