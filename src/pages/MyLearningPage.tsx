import { useState } from 'react';
import { AlertTriangle, CalendarClock, GraduationCap, Layers, ListChecks, Loader2, RefreshCw, RotateCw, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { QuestCard } from '@/components/design/QuestCard';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { LearningState } from '@/components/feedback/LearningState';
import { Button } from '@/components/ui/button';
import { LearningEntryDialog } from '@/components/learning/LearningEntryDialog';
import { useStartPlanTask } from '@/components/learning/useStartPlanTask';
import { useCurrentPlan, useDiagnosis, useRecentEvidence } from '@/lib/hooks';
import { DEMO_COURSE_ID, DEMO_LEARNER_ID } from '@/store';

function formatTime(iso: string) { try { return new Date(iso).toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }
const STRATEGY_LABEL: Record<string, string> = { diagnosis_driven: '诊断驱动' };

export function MyLearningPage() {
  const [preparingTaskId, setPreparingTaskId] = useState<string | null>(null);
  const { startTask, startingTaskId, error: startError } = useStartPlanTask();
  const { summary, plan, loading, error, refetch, generate, generating } = useCurrentPlan(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const diagnosis = useDiagnosis(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const evidence = useRecentEvidence();
  const tasks = plan?.tasks ?? [];
  const preparingTask = tasks.find((task) => task.id === preparingTaskId) ?? null;
  const courseEvidence = (evidence.data ?? []).filter((item) => item.learnerId === DEMO_LEARNER_ID && item.courseId === DEMO_COURSE_ID);
  return <AppShell><div className="space-y-6">
    <GlassPanel className="relative overflow-hidden p-6 sm:p-8"><div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-200/30 blur-3xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-semibold text-primary-700"><GraduationCap className="h-4 w-4" />GROWTH ROUTE</p><h1 className="mt-2 text-3xl font-bold">我的成长路线</h1><p className="mt-2 text-sm text-[var(--em-muted-ink)]">小涟根据真实诊断与当前计划，为你连接下一步学习星轨。</p></div><XiaolianCharacter state="encourage" size="md" /></div></GlassPanel>
    {loading && <LearningState kind="loading" title="正在读取当前成长路线" />}
    {error && !summary && <LearningState kind="error" title="暂时无法读取学习状态" action={<Button variant="outline" onClick={refetch} className="gap-2"><RotateCw className="h-4 w-4" />重新加载</Button>} />}
    {!loading && !error && !summary && <LearningState kind="empty" title="小涟还没有为你生成学习计划" description="点击下方按钮，小涟会结合你的真实学习诊断生成下一步路线。" action={<Button className="rounded-xl bg-primary-500 hover:bg-primary-600" onClick={() => void generate()} disabled={generating}>{generating ? <><Loader2 className="h-4 w-4 animate-spin" />正在生成…</> : <><Sparkles className="h-4 w-4" />生成学习计划</>}</Button>} />}
    {!loading && summary && <>
      <GlassPanel className="p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-[var(--em-muted-ink)]">计划生成时间</p><p className="mt-1 flex items-center gap-2 text-sm font-bold"><CalendarClock className="h-4 w-4 text-primary-500" />{formatTime(plan?.generatedAt ?? summary.generatedAt)}</p></div><div><p className="text-xs text-[var(--em-muted-ink)]">路线策略</p><p className="mt-1 flex items-center gap-2 text-sm font-bold"><Layers className="h-4 w-4 text-star" />{STRATEGY_LABEL[summary.strategy] ?? summary.strategy}</p></div><div><p className="text-xs text-[var(--em-muted-ink)]">星轨关卡</p><p className="mt-1 flex items-center gap-2 text-sm font-bold"><ListChecks className="h-4 w-4 text-companion" />{tasks.length} 项</p></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--em-muted-ink)]">当前计划 · 重新规划后会取代本计划</p><Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => void generate()} disabled={generating}>{generating ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />正在规划…</> : <><RefreshCw className="h-3.5 w-3.5" />重新规划</>}</Button></div></GlassPanel>
      <div className="relative mx-auto max-w-4xl space-y-4 before:absolute before:bottom-8 before:left-5 before:top-8 before:w-px before:bg-gradient-to-b before:from-primary-300 before:via-star before:to-transparent sm:before:left-7">{tasks.length > 0 ? tasks.map((task, index) => <div key={task.id} className="relative pl-12 sm:pl-16"><span className="absolute left-[14px] top-6 h-3 w-3 rounded-full bg-primary-500 shadow-[0_0_18px_rgba(139,124,246,0.65)] sm:left-[22px]" /><QuestCard task={task} index={index} pending={startingTaskId === task.id} onStart={() => setPreparingTaskId(task.id)} /></div>) : <GlassPanel className="p-6 text-sm text-[var(--em-muted-ink)]">当前没有需要立即补强的知识点，可以继续推进新的学习内容。</GlassPanel>}</div>
      {startError && <p className="flex items-center gap-2 text-sm text-amber-700"><AlertTriangle className="h-4 w-4" />{startError}</p>}
    </>}
    <LearningEntryDialog open={preparingTask !== null} onOpenChange={(open) => { if (!open) setPreparingTaskId(null); }} plan={plan} task={preparingTask} diagnosis={diagnosis.data} evidence={courseEvidence} dataLoading={diagnosis.loading || evidence.loading} diagnosisError={diagnosis.error} evidenceError={evidence.error} starting={startingTaskId === preparingTask?.id} startError={startError} onConfirm={() => { if (plan && preparingTask) void startTask(plan, preparingTask); }} />
  </div></AppShell>;
}
