import { useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, GraduationCap, Layers, ListChecks, Loader2, RefreshCw, RotateCw, Route, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { QuestCard } from '@/components/design/QuestCard';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { LearningState } from '@/components/feedback/LearningState';
import { Button } from '@/components/ui/button';
import { LearningEntryDialog } from '@/components/learning/LearningEntryDialog';
import { useStartPlanTask } from '@/components/learning/useStartPlanTask';
import { useCurrentPlan, useDiagnosis, useRecentEvidence } from '@/lib/hooks';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';

function formatTime(iso: string) { try { return new Date(iso).toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }
const STRATEGY_LABEL: Record<string, string> = { diagnosis_driven: '诊断驱动' };

export function MyLearningPage() {
  const [preparingTaskId, setPreparingTaskId] = useState<string | null>(null);
  const { startTask, startingTaskId, error: startError } = useStartPlanTask();
  const { summary, plan, loading, error, refetch, generate, generating } = useCurrentPlan(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const diagnosis = useDiagnosis(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const evidence = useRecentEvidence();
  const tasks = plan?.tasks ?? [];
  const preparingTask = tasks.find((task) => task.id === preparingTaskId) ?? null;
  const courseEvidence = (evidence.data ?? []).filter((item) => item.learnerId === ACTIVE_LEARNER_ID && item.courseId === ACTIVE_COURSE_ID);
  return <AppShell scene="companion"><div className="mx-auto max-w-6xl space-y-5">
    <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/55 px-5 py-5 shadow-[0_18px_55px_rgba(97,78,170,0.11)] backdrop-blur-xl sm:px-7"><div className="absolute right-12 top-0 h-32 w-32 rounded-full bg-violet-200/35 blur-3xl" /><div className="relative flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold text-primary-700"><GraduationCap className="h-4 w-4" />GROWTH ROUTE</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">我的成长路线</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--em-muted-ink)]">沿着真实诊断生成的任务前进，每一步都会留下学习证据。</p></div><XiaolianCharacter state="encourage" size="sm" /></div></header>
    {loading && <LearningState kind="loading" title="正在读取当前成长路线" />}
    {error && !summary && <LearningState kind="error" title="暂时无法读取学习状态" action={<Button variant="outline" onClick={refetch} className="gap-2"><RotateCw className="h-4 w-4" />重新加载</Button>} />}
    {!loading && !error && !summary && <GlassPanel className="overflow-hidden p-5 sm:p-7"><div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-primary-700"><Route className="h-5 w-5" /></span><div><h2 className="text-lg font-bold">还没有正在进行的路线</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--em-muted-ink)]">小涟会读取当前课程的真实诊断，建立第一条可执行路线；未点击前不会自动生成。</p></div></div><Button className="gap-2 rounded-2xl bg-primary-500 px-5" onClick={() => void generate()} disabled={generating}>{generating ? <><Loader2 className="h-4 w-4 animate-spin" />正在建立路线…</> : <><Sparkles className="h-4 w-4" />让小涟帮我建立第一条学习路线</>}</Button></div></GlassPanel>}
    {!loading && summary && <>
      <GlassPanel className="p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-violet-50/65 p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">建立时间</p><p className="mt-1 flex items-center gap-2 text-xs font-bold"><CalendarClock className="h-3.5 w-3.5 text-primary-500" />{formatTime(plan?.generatedAt ?? summary.generatedAt)}</p></div><div className="rounded-2xl bg-amber-50/55 p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">路线依据</p><p className="mt-1 flex items-center gap-2 text-xs font-bold"><Layers className="h-3.5 w-3.5 text-star" />{STRATEGY_LABEL[summary.strategy] ?? summary.strategy}</p></div><div className="rounded-2xl bg-sky-50/55 p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">接下来</p><p className="mt-1 flex items-center gap-2 text-xs font-bold"><ListChecks className="h-3.5 w-3.5 text-companion" />按顺序完成 {tasks.length} 项</p></div></div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-[var(--em-muted-ink)]">重新规划会替换当前路线</p><Button variant="ghost" size="sm" className="gap-2 rounded-xl" onClick={() => void generate()} disabled={generating}>{generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}重新规划</Button></div></GlassPanel>
      <section aria-labelledby="route-heading"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold text-primary-700">CURRENT JOURNEY</p><h2 id="route-heading" className="mt-1 text-xl font-bold">从这里继续</h2></div>{tasks.length > 0 && <span className="flex items-center gap-1 text-xs text-[var(--em-muted-ink)]">按服务端顺序 <ArrowRight className="h-3.5 w-3.5" /></span>}</div><div className="relative mx-auto max-w-4xl space-y-3 before:absolute before:bottom-8 before:left-5 before:top-8 before:w-px before:bg-gradient-to-b before:from-primary-300 before:via-star before:to-transparent sm:before:left-7">{tasks.length > 0 ? tasks.map((task, index) => <div key={task.id} className="relative pl-12 sm:pl-16"><span className="absolute left-[14px] top-6 h-3 w-3 rounded-full bg-primary-500 shadow-[0_0_18px_rgba(139,124,246,0.65)] sm:left-[22px]" /><QuestCard task={task} index={index} active={index === 0} pending={startingTaskId === task.id} onStart={() => setPreparingTaskId(task.id)} /></div>) : <div className="rounded-2xl border border-dashed border-violet-200 bg-white/40 px-5 py-4 text-sm text-[var(--em-muted-ink)]">当前路线没有待完成任务。这里不补造新的学习任务，可以在有新证据后重新规划。</div>}</div></section>
      {startError && <p className="flex items-center gap-2 text-sm text-amber-700"><AlertTriangle className="h-4 w-4" />{startError}</p>}
    </>}
    <LearningEntryDialog open={preparingTask !== null} onOpenChange={(open) => { if (!open) setPreparingTaskId(null); }} plan={plan} task={preparingTask} diagnosis={diagnosis.data} evidence={courseEvidence} dataLoading={diagnosis.loading || evidence.loading} diagnosisError={diagnosis.error} evidenceError={evidence.error} starting={startingTaskId === preparingTask?.id} startError={startError} onConfirm={() => { if (plan && preparingTask) void startTask(plan, preparingTask); }} />
  </div></AppShell>;
}
