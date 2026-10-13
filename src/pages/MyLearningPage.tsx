import { useState } from 'react';
import { AlertTriangle, CalendarClock, GraduationCap, Layers, ListChecks, Loader2, RefreshCw, RotateCw, Route, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { QuestCard } from '@/components/design/QuestCard';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { LearningState } from '@/components/feedback/LearningState';
import { Button } from '@/components/ui/button';
import { LearningEntryDialog } from '@/components/learning/LearningEntryDialog';
import { useStartPlanTask } from '@/components/learning/useStartPlanTask';
import { MasteryBreakdown, type MasteryBreakdownPoint } from '@/components/learning/MasteryBreakdown';
import { useCurrentPlan, useDiagnosis, useRecentEvidence } from '@/lib/hooks';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';
import { LeapEntryCard } from '@/components/adaptive/LeapEntryCard';

function formatTime(iso: string) { try { return new Date(iso).toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }
const STRATEGY_LABEL: Record<string, string> = { diagnosis_driven: '诊断驱动' };
const ASSESSED_STATUSES = new Set(['mastered', 'proficient', 'developing', 'weak']);

function masteryBreakdownPoints(diagnosis: ReturnType<typeof useDiagnosis>['data']): MasteryBreakdownPoint[] {
  if (!diagnosis) return [];
  const points = [
    diagnosis.primaryFocus,
    ...diagnosis.priorityInterventions,
    ...diagnosis.strengths,
    ...diagnosis.weakPoints,
    ...diagnosis.developingPoints,
    ...diagnosis.unassessedPoints,
  ];
  const seen = new Set<string>();
  const breakdown: MasteryBreakdownPoint[] = [];
  for (const point of points) {
    if (!point || seen.has(point.knowledgePointId)) continue;
    seen.add(point.knowledgePointId);
    breakdown.push({
      label: point.knowledgePointName,
      evidenceCount: point.evidenceCount,
      value: ASSESSED_STATUSES.has(point.status)
        ? Math.round(Math.min(1, Math.max(0, point.masteryScore)) * 100)
        : null,
    });
  }
  return breakdown;
}

export function MyLearningPage() {
  const [preparingTaskId, setPreparingTaskId] = useState<string | null>(null);
  const { startTask, startingTaskId, error: startError } = useStartPlanTask();
  const { summary, plan, loading, error, refetch, generate, generating } = useCurrentPlan(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const diagnosis = useDiagnosis(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const evidence = useRecentEvidence();
  const tasks = plan?.tasks ?? [];
  const preparingTask = tasks.find((task) => task.id === preparingTaskId) ?? null;
  const courseEvidence = (evidence.data ?? []).filter((item) => item.learnerId === ACTIVE_LEARNER_ID && item.courseId === ACTIVE_COURSE_ID);
  const masteryPoints = masteryBreakdownPoints(diagnosis.data);
  return <AppShell scene="companion"><div className="mx-auto max-w-6xl space-y-5">
    <header className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] px-5 py-4 shadow-[var(--em-shadow-sm)] sm:px-6"><div className="flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-[10px] font-semibold text-[var(--em-primary-deep)]"><GraduationCap className="h-4 w-4" />CURRENT STUDY PLAN</p><h1 className="mt-1 text-2xl font-bold">我的学习任务</h1><p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--em-muted-ink)]">查看当前课程计划中的任务、诊断依据与预计学习时间。</p></div><XiaolianCharacter state="encourage" size="sm" /></div></header>
    <LeapEntryCard />
    {loading && <LearningState kind="loading" title="正在读取当前成长路线" />}
    {error && !summary && <LearningState kind="error" title="暂时无法读取学习状态" action={<Button variant="outline" onClick={refetch} className="gap-2"><RotateCw className="h-4 w-4" />重新加载</Button>} />}
    {!loading && !error && !summary && <GlassPanel className="p-5 sm:p-7"><div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--em-primary-subtle)] text-[var(--em-primary-deep)]"><Route className="h-5 w-5" /></span><div><h2 className="text-lg font-bold">当前课程还没有学习计划</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--em-muted-ink)]">按下方操作后，小涟会基于当前课程的真实诊断建立计划；计划不会自动生成。</p></div></div><Button className="gap-2 rounded-lg px-5" onClick={() => void generate()} disabled={generating}>{generating ? <><Loader2 className="h-4 w-4 animate-spin" />正在建立计划…</> : <><Sparkles className="h-4 w-4" />基于诊断建立学习计划</>}</Button></div></GlassPanel>}
    {!loading && summary && <>
      <GlassPanel className="p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[var(--em-primary-subtle)] p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">计划生成时间</p><p className="mt-1 flex items-center gap-2 text-xs font-bold"><CalendarClock className="h-3.5 w-3.5 text-[var(--em-primary)]" />{formatTime(plan?.generatedAt ?? summary.generatedAt)}</p></div><div className="rounded-xl bg-[var(--em-surface-subtle)] p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">计划策略</p><p className="mt-1 flex items-center gap-2 text-xs font-bold"><Layers className="h-3.5 w-3.5 text-[var(--em-primary)]" />{STRATEGY_LABEL[summary.strategy] ?? summary.strategy}</p></div><div className="rounded-xl bg-[var(--em-surface-subtle)] p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">计划任务数</p><p className="mt-1 flex items-center gap-2 text-xs font-bold"><ListChecks className="h-3.5 w-3.5 text-[var(--em-primary)]" />{tasks.length} 项</p></div></div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-[var(--em-muted-ink)]">重新规划会替换当前计划。</p><Button variant="ghost" size="sm" className="gap-2 rounded-lg" onClick={() => void generate()} disabled={generating}>{generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}重新规划</Button></div></GlassPanel>
      <section aria-labelledby="tasks-heading"><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-[var(--em-primary-deep)]">TASKS FROM CURRENT PLAN</p><h2 id="tasks-heading" className="mt-1 text-lg font-bold">学习工单</h2></div>{tasks.length > 0 && <span className="text-xs text-[var(--em-muted-ink)]">按当前计划的任务顺序</span>}</div><div className="mx-auto max-w-4xl space-y-3">{tasks.length > 0 ? tasks.map((task, index) => <QuestCard key={task.id} task={task} index={index} pending={startingTaskId === task.id} onStart={() => setPreparingTaskId(task.id)} />) : <div className="rounded-xl border border-dashed border-[var(--em-border)] bg-[var(--em-surface)] px-5 py-4 text-sm text-[var(--em-muted-ink)]">当前计划没有可展示的任务。</div>}</div></section>
      {startError && <p className="flex items-center gap-2 text-sm text-[var(--em-danger)]"><AlertTriangle className="h-4 w-4" />{startError}</p>}
      {!diagnosis.loading && !diagnosis.error && masteryPoints.length > 0 && (
        <GlassPanel className="p-4 sm:p-5">
          <MasteryBreakdown points={masteryPoints} />
        </GlassPanel>
      )}
    </>}
    <LearningEntryDialog open={preparingTask !== null} onOpenChange={(open) => { if (!open) setPreparingTaskId(null); }} plan={plan} task={preparingTask} diagnosis={diagnosis.data} evidence={courseEvidence} dataLoading={diagnosis.loading || evidence.loading} diagnosisError={diagnosis.error} evidenceError={evidence.error} starting={startingTaskId === preparingTask?.id} startError={startError} onConfirm={() => { if (plan && preparingTask) void startTask(plan, preparingTask); }} />
  </div></AppShell>;
}
