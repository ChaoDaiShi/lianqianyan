import { ArrowRight, CalendarClock, Compass, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DiagnosisResult, LearnerProfile, PersistedStudyPlan } from '@/domain';
import { DIAGNOSIS_REASON_TEXT } from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianMessage } from '@/components/xiaolian/XiaolianMessage';

interface XiaolianDailyInsightProps {
  profile: LearnerProfile | null;
  diagnosis: DiagnosisResult | null;
  plan: PersistedStudyPlan | null;
  evidence: LearningEvidence[];
  loading: boolean;
  error: boolean;
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function XiaolianDailyInsight({ profile, diagnosis, plan, evidence, loading, error }: XiaolianDailyInsightProps) {
  const focus = diagnosis?.primaryFocus ?? null;
  const orderedTasks = [...(plan?.tasks ?? [])].sort((a, b) => a.order - b.order);
  const nextTask = (focus ? orderedTasks.find((task) => task.knowledgePointId === focus.knowledgePointId) : null) ?? orderedTasks[0] ?? null;
  const latestEvidence = [...evidence].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0] ?? null;
  const knowledgeNames = Object.fromEntries((profile?.knowledgePoints ?? []).map((point) => [point.knowledgePointId, point.knowledgePointName]));
  const reason = focus?.reasonCodes.map((code) => DIAGNOSIS_REASON_TEXT[code]).filter(Boolean).join(' ') ?? '';
  const taskHref = nextTask ? `/space?task_id=${encodeURIComponent(nextTask.id)}&knowledge_point_id=${encodeURIComponent(nextTask.knowledgePointId)}` : '/my-learning';

  const recentState = latestEvidence
    ? `${latestEvidence.evidenceType === 'practice_answer_evaluated' ? '完成了一次练习评价' : '开始了一次学习'}${latestEvidence.knowledgePointId && knowledgeNames[latestEvidence.knowledgePointId] ? ` · ${knowledgeNames[latestEvidence.knowledgePointId]}` : ''}${formatTime(latestEvidence.occurredAt) ? ` · ${formatTime(latestEvidence.occurredAt)}` : ''}`
    : '当前课程还没有可展示的学习记录。';

  return <GlassPanel className="p-5 sm:p-7">
    <div><p className="text-[10px] font-bold tracking-[0.18em] text-primary-600">XIAOLIAN DAILY INSIGHT</p><h2 className="mt-1 text-2xl font-bold">小涟今日观察</h2><p className="mt-2 text-xs text-[var(--em-muted-ink)]">只根据当前学习画像、诊断、计划与真实学习记录整理。</p></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      <div className="rounded-[22px] border border-violet-100 bg-white/55 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-primary-700"><Target className="h-4 w-4" />当前主要关注</p>{loading ? <p className="mt-3 text-sm text-[var(--em-muted-ink)]">正在读取真实诊断…</p> : error ? <p className="mt-3 text-sm text-amber-700">诊断暂时没有完整加载。</p> : focus ? <><strong className="mt-3 block">{focus.knowledgePointName}</strong><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">{focus.evidenceCount} 条评价证据{reason ? ` · ${reason}` : ''}</p></> : <p className="mt-3 text-sm leading-6 text-[var(--em-muted-ink)]">暂无可证明的优先关注项；未评估不代表薄弱。</p>}</div>
      <div className="rounded-[22px] border border-sky-100 bg-white/55 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-sky-700"><CalendarClock className="h-4 w-4" />最近学习状态</p><p className="mt-3 text-sm leading-6 text-[var(--em-muted-ink)]">{loading ? '正在读取最近学习记录…' : error ? '最近学习记录暂时没有完整加载。' : recentState}</p></div>
      <div className="rounded-[22px] border border-pink-100 bg-white/55 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-fuchsia-700"><Compass className="h-4 w-4" />下一步建议</p>{loading ? <p className="mt-3 text-sm text-[var(--em-muted-ink)]">正在同步当前计划…</p> : nextTask ? <><strong className="mt-3 block">{nextTask.knowledgePointName}</strong><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">当前计划任务 {nextTask.order}，预计 {nextTask.estimatedMinutes} 分钟。</p></> : <p className="mt-3 text-sm leading-6 text-[var(--em-muted-ink)]">当前没有 ACTIVE 学习计划，可以前往“我的学习”生成。</p>}<Link to={taskHref} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-700">{nextTask ? '进入建议任务' : '查看我的学习'}<ArrowRight className="h-3.5 w-3.5" /></Link></div>
    </div>
    {!loading && !error && nextTask && <XiaolianMessage tone="suggest" compact className="mt-4">我们今天先把注意力放在「{nextTask.knowledgePointName}」上，一次只推进一个真实任务。</XiaolianMessage>}
  </GlassPanel>;
}
