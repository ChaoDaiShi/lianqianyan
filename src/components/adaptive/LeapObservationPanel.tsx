import { AlertCircle, BrainCircuit, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi } from '@/lib/services';
import { fetchLeapOverview } from '@/lib/adaptiveApi';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';

function percent(value: number | null) {
  return value === null ? '尚无估计' : `${Math.round(value * 100)}%`;
}

export function LeapObservationPanel({ learnerId = ACTIVE_LEARNER_ID, courseId = ACTIVE_COURSE_ID }: { learnerId?: string; courseId?: string }) {
  const isDataStructure = courseId === 'course-ds';
  const overview = useApi(
    () => isDataStructure ? fetchLeapOverview(learnerId, courseId) : Promise.resolve(null),
    [isDataStructure, learnerId, courseId],
  );

  if (!isDataStructure) {
    return <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5"><h2 className="font-bold">LEAP 当前仅支持数据结构课程</h2><p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">当前课程没有 LEAP 诊断数据。请先在课程入口明确选择数据结构；这里不会显示其他课程的数据，也不会自动更改课程。</p><Link to="/adaptive" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--em-primary-deep)] hover:underline">前往课程入口 <span aria-hidden="true">→</span></Link></section>;
  }
  if ((overview.loading || (!overview.data && !overview.error))) return <section className="rounded-2xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 text-sm text-[var(--em-muted-ink)]">正在读取你的学习状态…</section>;
  if (overview.error && !overview.data) return <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5"><div className="flex items-center gap-2 text-amber-800"><AlertCircle className="h-4 w-4" /><h2 className="font-bold">LEAP 状态读取失败</h2></div><p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">当前不展示本地示例或估算结果。</p><button type="button" onClick={() => void overview.refetch()} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--em-primary-deep)]"><RefreshCw className="h-3.5 w-3.5" />重新加载</button></section>;

  const states = overview.data?.states ?? [];
  return (
    <section className="space-y-4 rounded-2xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 sm:p-6" aria-label="LEAP 学习观察">
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-700"><BrainCircuit className="h-4 w-4" /></span>
        <div><p className="text-[10px] font-bold tracking-[0.15em] text-[var(--em-primary-deep)]">LEAP OBSERVATION</p><h2 className="mt-1 text-lg font-bold">数据结构自适应学习状态</h2><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">M 为未校准的 LEAP 掌握估计，U 为不确定性指标，Q 为按课程规则计算的误解候选权重；这些值不是训练或校准得到的个人概率。</p></div>
      </header>
      {states.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--em-border)] bg-[var(--em-primary-subtle)] p-4 text-sm leading-6 text-[var(--em-muted-ink)]">还没有 LEAP 学习证据。完成数据结构诊断后，这里会逐步呈现掌握估计、不确定性、误解候选与相关证据。</div> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {states.map((state) => (
            <article key={state.knowledgePointId} className="rounded-2xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4">
              <h3 className="text-sm font-bold">{state.name}</h3>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[var(--em-primary-subtle)] p-2"><dt className="text-[10px] text-[var(--em-muted-ink)]">M · LEAP 掌握估计（未校准）</dt><dd className="mt-1 text-sm font-bold">{percent(state.mastery)}</dd></div>
                <div className="rounded-xl bg-sky-50 p-2"><dt className="text-[10px] text-[var(--em-muted-ink)]">U · 不确定性指标</dt><dd className="mt-1 text-sm font-bold">{percent(state.uncertainty)}</dd></div>
                <div className="rounded-xl bg-amber-50 p-2"><dt className="text-[10px] text-[var(--em-muted-ink)]">Q · 规则误解候选权重</dt><dd className="mt-1 text-sm font-bold">{state.misconceptions.length ? `${state.misconceptions.length} 项候选` : '无候选'}</dd></div>
              </dl>
              <div className="mt-3 border-t border-[var(--em-border)] pt-3">
                <p className="text-[10px] font-semibold text-[var(--em-muted-ink)]">规则误解候选 · 模型 {state.modelVersion}</p>
                {state.misconceptions.length ? <ul className="mt-2 space-y-1.5">{state.misconceptions.map((candidate) => <li key={candidate.code} className="flex items-center justify-between gap-2 text-xs"><span className="font-medium">{candidate.code}</span><span className="text-[var(--em-muted-ink)]">规则权重 {candidate.probability.toFixed(2)}</span></li>)}</ul> : <p className="mt-2 text-xs text-[var(--em-muted-ink)]">当前没有误解候选。</p>}
                <p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">已有 {state.evidenceCount} 条评价证据。带提示的训练单独记录，独立新题将提供进一步依据。</p>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-[var(--em-primary-subtle)] p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">会话数</p><p className="mt-1 text-lg font-bold">{overview.data?.stats.totalSessions ?? 0}</p></div>
        <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">已完成</p><p className="mt-1 text-lg font-bold">{overview.data?.stats.completedSessions ?? 0}</p></div>
        <div className="rounded-xl bg-sky-50 p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">独立答对</p><p className="mt-1 text-lg font-bold">{overview.data?.stats.independentCorrect ?? 0}/{overview.data?.stats.independentTotal ?? 0}</p></div>
        <div className="rounded-xl bg-amber-50 p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">本次验证通过记录</p><p className="mt-1 text-lg font-bold">{overview.data?.stats.misconceptionsRepaired ?? 0}</p></div>
      </div>
      {overview.data?.limitations.length ? <ul className="space-y-1 border-t border-[var(--em-border)] pt-3 text-xs leading-5 text-[var(--em-muted-ink)]">{overview.data.limitations.map((limitation) => <li key={limitation}>· {limitation}</li>)}</ul> : null}
    </section>
  );
}
