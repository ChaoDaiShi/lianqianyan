import { CalendarClock, CheckCircle2, Clock3, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi } from '@/lib/services';
import { fetchLeapOverview } from '@/lib/adaptiveApi';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatScore(value: number | null | undefined) {
  return value === null || value === undefined ? '未评分' : `${Math.round(value * 100)}%`;
}

export function LeapArchivePanel({ learnerId = ACTIVE_LEARNER_ID, courseId = ACTIVE_COURSE_ID }: { learnerId?: string; courseId?: string }) {
  const isDataStructure = courseId === 'course-ds';
  const overview = useApi(
    () => isDataStructure ? fetchLeapOverview(learnerId, courseId) : Promise.resolve(null),
    [isDataStructure, learnerId, courseId],
  );

  if (!isDataStructure) return <section className="rounded-[26px] border border-amber-100 bg-amber-50/45 p-5"><h2 className="font-bold">LEAP 档案适用于数据结构课程</h2><p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">当前课程下没有可读取的 LEAP 档案。请在课程入口明确选择数据结构；当前课程不会自动更改。</p><Link to="/adaptive" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline">前往课程入口 <span aria-hidden="true">→</span></Link></section>;
  if ((overview.loading || (!overview.data && !overview.error))) return <section className="rounded-[26px] border border-violet-100 bg-white/50 p-5 text-sm text-[var(--em-muted-ink)]">正在读取 LEAP 前测、教学与后测记录…</section>;
  if (overview.error && !overview.data) return <section className="rounded-[26px] border border-amber-100 bg-amber-50/45 p-5"><p className="text-sm font-semibold">LEAP 档案暂时无法读取</p><button type="button" onClick={() => void overview.refetch()} className="mt-3 text-sm font-semibold text-primary-700">重新加载</button></section>;

  const sessions = [...(overview.data?.sessions ?? [])].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return (
    <section className="space-y-5 rounded-[28px] border border-violet-100 bg-white/50 p-5 sm:p-6" aria-label="LEAP 学习档案">
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CalendarClock className="h-4 w-4" /></span>
        <div><p className="text-[10px] font-bold tracking-[0.15em] text-primary-700">LEAP LEARNING ARCHIVE</p><h2 className="mt-1 text-lg font-bold">前测、教学与独立后测</h2><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">时间点与结果只取自后端会话及证据；尚未发生的阶段明确显示为待完成。</p></div>
      </header>
      {!sessions.length ? <div className="rounded-2xl border border-dashed border-violet-200 bg-white/45 p-5"><p className="text-sm font-semibold">还没有 LEAP 学习会话</p><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">开始数据结构诊断后，前测、教学过程和独立后测会按真实发生顺序记录在这里。</p><Link to="/adaptive" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white">开始诊断 <GraduationCap className="h-3.5 w-3.5" /></Link></div> : (
        <ol className="space-y-4">
          {sessions.map((session) => {
            const diagnostic = session.evidence.find((evidence) => evidence.kind === 'diagnostic');
            const teaching = session.evidence.find((evidence) => evidence.kind === 'intervention');
            const independentPosttest = [...session.evidence].reverse().find((evidence) => ['probe', 'retest'].includes(evidence.kind));
            const hasIndependentResult = Boolean(session.outcome?.independent);
            return (
              <li key={session.id} className="rounded-2xl border border-violet-100 bg-white/70 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h3 className="font-bold">{session.topicName}</h3><p className="mt-1 text-[10px] text-[var(--em-muted-ink)]">{formatTime(session.createdAt)} · {session.policy === 'leap' ? 'LEAP 策略' : '固定策略'} · 组别 {session.experimentGroup}</p></div>
                  <Link to={`/adaptive?session=${encodeURIComponent(session.id)}`} className="text-xs font-semibold text-primary-700 hover:underline">{session.phase === 'completed' ? '查看结果' : '继续会话'} →</Link>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <article className="rounded-xl bg-sky-50/75 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-800"><Clock3 className="h-3.5 w-3.5" />前测</p>
                    {diagnostic ? <><p className="mt-2 text-xs leading-5">{diagnostic.summary}</p><p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">{formatTime(diagnostic.createdAt)} · 得分 {formatScore(diagnostic.score)}</p></> : <p className="mt-2 text-xs text-[var(--em-muted-ink)]">尚未产生前测作答证据。</p>}
                    {session.diagnosis ? <p className="mt-2 text-[10px] leading-4 text-sky-900">后端判断：{session.diagnosis.title} · 依据 {session.diagnosis.reason}</p> : null}
                  </article>
                  <article className="rounded-xl bg-violet-50/75 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-800"><GraduationCap className="h-3.5 w-3.5" />教学介入</p>
                    {session.teaching ? <><p className="mt-2 text-xs font-semibold">{session.teaching.title}</p><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">{session.decision?.reason ?? session.teaching.introduction}</p>{teaching ? <p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">{formatTime(teaching.createdAt)} · {teaching.summary}</p> : null}</> : <p className="mt-2 text-xs text-[var(--em-muted-ink)]">尚未进入教学阶段。</p>}
                  </article>
                  <article className="rounded-xl bg-emerald-50/75 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />独立后测</p>
                    {session.outcome ? <><p className="mt-2 text-xs leading-5">{session.outcome.feedback}</p><p className="mt-2 text-xs font-bold">{hasIndependentResult ? '独立作答' : '非独立练习'} · 得分 {formatScore(session.outcome.score)} · 前后测 {formatScore(session.outcome.preScore)} → {formatScore(session.outcome.postScore)} · 变化 {session.outcome.observedGain > 0 ? '+' : ''}{Math.round(session.outcome.observedGain * 100)} 个百分点</p><p className="mt-1 text-[10px] text-[var(--em-muted-ink)]">{formatTime(session.outcome.completedAt)} · 误解状态：{session.outcome.misconceptionStatus === 'repaired' ? '已修复' : session.outcome.misconceptionStatus === 'persisting' ? '仍存在' : '待确认'}</p></> : independentPosttest ? <><p className="mt-2 text-xs leading-5">{independentPosttest.summary}</p><p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">{formatTime(independentPosttest.createdAt)} · {independentPosttest.kind === 'probe' ? '迁移探测' : independentPosttest.kind === 'retest' ? '延迟复测' : '练习'} · 得分 {formatScore(independentPosttest.score)}；结果尚未写入 outcome。</p></> : <p className="mt-2 text-xs text-[var(--em-muted-ink)]">尚未产生独立后测结果。</p>}</article>
                </div>
                {session.outcome?.retestScore !== null && session.outcome?.retestScore !== undefined ? <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs">延迟复测得分：{formatScore(session.outcome.retestScore)}</p> : session.retestDueAt ? <p className="mt-3 rounded-xl bg-amber-50/75 px-3 py-2 text-xs text-amber-900">延迟复测待完成 · 计划时间 {formatTime(session.retestDueAt)}</p> : null}
              </li>
            );
          })}
        </ol>
      )}
      {overview.data?.limitations.length ? <ul className="border-t border-violet-100 pt-4 text-xs leading-5 text-[var(--em-muted-ink)]">{overview.data.limitations.map((limitation) => <li key={limitation}>· {limitation}</li>)}</ul> : null}
    </section>
  );
}
