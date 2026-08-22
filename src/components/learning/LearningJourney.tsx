import { Check, Circle, RefreshCw } from 'lucide-react';
import type { DiagnosisResult, PersistedStudyPlan } from '@/domain';
import type { LearningEvidence, ReplanningResult } from '@/lib/educationApi';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/design/GlassPanel';

interface LearningJourneyProps {
  diagnosis: DiagnosisResult | null;
  plan: PersistedStudyPlan | null;
  evidence: LearningEvidence[];
  replanning?: ReplanningResult | null;
  loading?: boolean;
  error?: boolean;
}

type StepState = 'complete' | 'waiting' | 'error';

export function LearningJourney({ diagnosis, plan, evidence, replanning, loading = false, error = false }: LearningJourneyProps) {
  const hasLearning = evidence.some((item) => item.evidenceType === 'learning_started');
  const hasAssessment = evidence.some((item) => item.evidenceType === 'practice_answer_evaluated');
  const replanState: StepState = replanning ? (replanning.status === 'failed' ? 'error' : 'complete') : 'waiting';
  const steps: Array<{ label: string; detail: string; state: StepState }> = [
    { label: 'Diagnosis', detail: diagnosis ? (diagnosis.primaryFocus ? `聚焦 ${diagnosis.primaryFocus.knowledgePointName}` : '诊断已形成') : '等待诊断', state: diagnosis ? 'complete' : error ? 'error' : 'waiting' },
    { label: 'Plan', detail: plan ? `${plan.tasks.length} 项当前任务` : '尚未生成计划', state: plan ? 'complete' : error ? 'error' : 'waiting' },
    { label: 'Learning', detail: hasLearning ? '已有真实学习记录' : '等待开始学习', state: hasLearning ? 'complete' : 'waiting' },
    { label: 'Assessment', detail: hasAssessment ? '已有练习评价证据' : '等待完成练习', state: hasAssessment ? 'complete' : 'waiting' },
    { label: 'Replanning', detail: replanning ? (replanning.status === 'performed' ? '计划已按结果调整' : replanning.status === 'not_needed' ? '当前计划仍然适合' : '本次计划调整失败') : '等待下一次练习评估', state: replanState },
  ];

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-bold tracking-[0.18em] text-primary-600">REAL LEARNING LOOP</p><h2 className="mt-1 text-xl font-bold">小涟如何陪你形成学习闭环</h2></div>{loading && <span className="text-xs text-[var(--em-muted-ink)]">正在同步真实状态…</span>}</div>
      <ol className="mt-6 grid gap-3 md:grid-cols-5">
        {steps.map((step, index) => <li key={step.label} className="relative"><div className={cn('h-full rounded-[18px] border p-4', step.state === 'complete' ? 'border-primary-200 bg-violet-50/70' : step.state === 'error' ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white/45')}><div className="flex items-center gap-2">{step.state === 'complete' ? <Check className="h-4 w-4 text-primary-600" /> : step.state === 'error' ? <RefreshCw className="h-4 w-4 text-amber-600" /> : <Circle className="h-4 w-4 text-slate-300" />}<span className="text-xs font-bold">{step.label}</span></div><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">{step.detail}</p></div>{index < steps.length - 1 && <span className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-primary-300 md:block">›</span>}</li>)}
      </ol>
      <p className="mt-4 text-[11px] text-[var(--em-muted-ink)]">每个已完成状态都来自当前 API 数据；没有证据的阶段保持等待，不会被模拟为完成。</p>
    </GlassPanel>
  );
}
