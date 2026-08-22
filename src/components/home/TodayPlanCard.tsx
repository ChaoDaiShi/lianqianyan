import { AlertTriangle, ArrowRight, Loader2, Route, Sparkles } from 'lucide-react';
import type { PersistedStudyPlan, PersistedStudyTask } from '@/domain';
import { ACTION_TYPE_LABEL } from '@/domain';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/design/GlassPanel';

interface TodayPlanCardProps {
  plan: PersistedStudyPlan | null;
  task: PersistedStudyTask | null;
  loading: boolean;
  error: boolean;
  generating: boolean;
  starting: boolean;
  startError?: string | null;
  onGenerate: () => void;
  onStart: () => void;
  onRetry: () => void;
}

export function TodayPlanCard({ plan, task, loading, error, generating, starting, startError, onGenerate, onStart, onRetry }: TodayPlanCardProps) {
  return <GlassPanel className="overflow-hidden p-5 sm:p-7">
    <div className="flex items-center gap-2"><Route className="h-4 w-4 text-primary-600" /><p className="text-xs font-bold tracking-[0.14em] text-primary-700">TODAY'S LEARNING</p></div>
    <h2 className="mt-2 text-2xl font-bold">今天只推进这一项</h2>
    {loading && <p className="mt-6 flex items-center gap-2 text-sm text-[var(--em-muted-ink)]"><Loader2 className="h-4 w-4 animate-spin" />正在同步当前学习计划…</p>}
    {!loading && error && <div className="mt-5"><p className="flex items-center gap-2 text-sm text-amber-700"><AlertTriangle className="h-4 w-4" />当前计划暂时没有加载成功</p><Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={onRetry}>重新加载</Button></div>}
    {!loading && !error && task && plan && <div className="mt-5 grid gap-5 rounded-[24px] border border-violet-100 bg-white/55 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-primary-700">任务 {task.order} / {plan.tasks.length}</span><h3 className="mt-3 text-xl font-bold">{task.knowledgePointName}</h3><p className="mt-2 text-sm text-[var(--em-muted-ink)]">{ACTION_TYPE_LABEL[task.actionType]} · 预计 {task.estimatedMinutes} 分钟</p></div><Button className="h-12 gap-2 rounded-2xl bg-primary-500 px-6" disabled={starting} onClick={onStart}>{starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{starting ? '正在开始…' : '开始当前任务'}</Button></div>}
    {!loading && !error && !task && <div className="mt-5 rounded-[22px] border border-dashed border-violet-200 bg-white/45 p-7 text-center"><Sparkles className="mx-auto h-7 w-7 text-primary-400" /><p className="mt-3 text-sm font-semibold">当前还没有学习计划</p><p className="mt-1 text-xs text-[var(--em-muted-ink)]">只有你点击后，才会请求生成真实计划。</p><Button className="mt-4 rounded-xl bg-primary-500" onClick={onGenerate} disabled={generating}>{generating ? <><Loader2 className="h-4 w-4 animate-spin" />正在生成…</> : '生成学习计划'}</Button></div>}
    {startError && <p className="mt-3 text-sm text-amber-700">{startError}</p>}
  </GlassPanel>;
}
