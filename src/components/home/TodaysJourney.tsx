import { useState } from 'react';
import { AlertTriangle, Check, Circle, Clock3, LockKeyhole, Loader2 } from 'lucide-react';
import type {
  DiagnosisResult,
  PersistedStudyPlan,
  PersistedStudyTask,
} from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildHomeJourney } from './homePresentation';

export interface TodaysJourneyProps {
  diagnosis: DiagnosisResult | null;
  plan: PersistedStudyPlan | null;
  currentTask: PersistedStudyTask | null;
  evidence: LearningEvidence[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function EvidenceRows({
  entries,
}: {
  entries: LearningEvidence[];
}) {
  if (entries.length === 0) {
    return <p className='text-sm text-[var(--em-muted-ink)]'>尚无这一阶段的学习记录。</p>;
  }
  return (
    <div className='space-y-3'>
      {entries.map(item => (
        <article key={item.id} className='rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] p-3'>
          <div className='flex flex-wrap items-start justify-between gap-2'>
            <p className='text-sm font-medium text-[var(--em-ink)]'>
              {item.evidenceType === 'learning_started' ? '学习已开始' : '练习已评价'}
              {item.knowledgePointId ? ` · ${item.knowledgePointId}` : ''}
            </p>
            <time className='text-xs text-[var(--em-muted-ink)]'>{formatTime(item.occurredAt)}</time>
          </div>
          <dl className='mt-2 grid gap-1 text-xs sm:grid-cols-[100px_minmax(0,1fr)]'>
            <dt className='text-[var(--em-muted-ink)]'>记录来源</dt>
            <dd className='text-[var(--em-ink)]'>{item.source}</dd>
            <dt className='text-[var(--em-muted-ink)]'>原始载荷</dt>
            <dd className='min-w-0 whitespace-pre-wrap break-words font-mono text-[var(--em-ink)]'>
              {JSON.stringify(item.payload, null, 2)}
            </dd>
          </dl>
        </article>
      ))}
    </div>
  );
}

function StageRecord({
  stage,
  diagnosis,
  plan,
  task,
  evidence,
}: {
  stage: 'diagnosis' | 'plan' | 'learning' | 'validation';
  diagnosis: DiagnosisResult | null;
  plan: PersistedStudyPlan | null;
  task: PersistedStudyTask | null;
  evidence: LearningEvidence[];
}) {
  if (stage === 'diagnosis') {
    if (!diagnosis) return <p className='text-sm text-[var(--em-muted-ink)]'>尚无诊断结果。完成初测后，这里会显示记录时间、证据数量与诊断重点。</p>;
    return (
      <dl className='grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[150px_minmax(0,1fr)]'>
        <dt className='text-[var(--em-muted-ink)]'>诊断记录时间</dt>
        <dd className='text-[var(--em-ink)]'>{formatTime(diagnosis.diagnosisGeneratedAt)}</dd>
        <dt className='text-[var(--em-muted-ink)]'>诊断结论</dt>
        <dd className='text-[var(--em-ink)]'>
          {diagnosis.primaryFocus
            ? `${diagnosis.primaryFocus.knowledgePointName} · ${diagnosis.primaryFocus.evidenceCount} 条评价证据`
            : '当前没有可证明的优先薄弱项'}
        </dd>
        <dt className='text-[var(--em-muted-ink)]'>状态依据</dt>
        <dd className='text-[var(--em-ink)]'>{diagnosis.summaryCodes.join('、') || '暂无状态代码'}</dd>
      </dl>
    );
  }

  if (stage === 'plan') {
    if (!plan) return <p className='text-sm text-[var(--em-muted-ink)]'>尚无已保存的学习计划。诊断完成后可以从今日任务卡生成计划。</p>;
    return (
      <div className='space-y-3'>
        <dl className='grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[150px_minmax(0,1fr)]'>
          <dt className='text-[var(--em-muted-ink)]'>计划生成时间</dt>
          <dd className='text-[var(--em-ink)]'>{formatTime(plan.generatedAt)}</dd>
          <dt className='text-[var(--em-muted-ink)]'>决策来源</dt>
          <dd className='text-[var(--em-ink)]'>{plan.strategy} · {plan.reasonCodes.join('、')}</dd>
          <dt className='text-[var(--em-muted-ink)]'>来源诊断时间</dt>
          <dd className='text-[var(--em-ink)]'>{formatTime(plan.sourceDiagnosisGeneratedAt)}</dd>
        </dl>
        <ol className='divide-y divide-[var(--em-border)] rounded-lg border border-[var(--em-border)]'>
          {plan.tasks.map(item => (
            <li key={item.id} className='flex flex-wrap justify-between gap-2 px-3 py-2 text-sm'>
              <span className='font-medium text-[var(--em-ink)]'>{item.order}. {item.knowledgePointName}</span>
              <span className='text-[var(--em-muted-ink)]'>{item.estimatedMinutes} 分钟 · {item.reasonCodes.join('、')}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const matchingEvidence = evidence.filter(item => {
    if (task && item.knowledgePointId !== task.knowledgePointId) return false;
    return stage === 'learning'
      ? item.evidenceType === 'learning_started'
      : item.evidenceType === 'practice_answer_evaluated';
  });
  const entries = matchingEvidence.slice(-3).reverse();
  return <EvidenceRows entries={entries} />;
}

export function TodaysJourney({
  diagnosis,
  plan,
  currentTask,
  evidence,
  loading,
  error,
  onRetry,
}: TodaysJourneyProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const journey = buildHomeJourney({
    diagnosis,
    plan,
    task: currentTask,
    evidence,
  });
  const current = journey.find(node => node.state === 'current');

  return (
    <section className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)] sm:p-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='text-lg font-semibold text-[var(--em-ink)]'>
            今日学习工序
          </h2>
          <p data-journey-summary='true' className='mt-1 text-sm leading-6 text-[var(--em-muted-ink)]'>
            {currentTask
              ? `围绕「${currentTask.knowledgePointName}」记录每个阶段的真实输入与结果。`
              : '从初测、方案、练习到独立验证，逐步留下可查证据。'}
          </p>
        </div>
        <p className='text-xs text-[var(--em-muted-ink)]'>
          当前阶段：{current?.label ?? '已完成'}
        </p>
      </div>

      {loading ? (
        <p role='status' className='mt-5 flex items-center gap-2 text-sm text-[var(--em-muted-ink)]'>
          <Loader2 className='h-4 w-4 animate-spin' />
          正在同步阶段记录…
        </p>
      ) : error ? (
        <div role='alert' className='mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4'>
          <p className='flex items-center gap-2 text-sm text-amber-900'>
            <AlertTriangle className='h-4 w-4' />
            学习工序记录暂时没有完整加载。
          </p>
          <Button variant='outline' size='sm' onClick={onRetry}>重新加载</Button>
        </div>
      ) : (
        <>
          <ol className='mt-5 grid gap-2 sm:grid-cols-4'>
            {journey.map((node, index) => {
              const expanded = expandedStage === node.id;
              return (
                <li key={node.id} data-journey-node={node.id} data-journey-state={node.state}>
                  <button
                    type='button'
                    aria-expanded={expanded}
                    aria-controls={`journey-record-${node.id}`}
                    onClick={() => setExpandedStage(expanded ? null : node.id)}
                    className={cn(
                      'flex h-full w-full items-start gap-3 rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--em-primary)] sm:flex-col sm:items-center sm:text-center',
                      node.state === 'completed' && 'border-[var(--em-success)] bg-[var(--em-surface-subtle)]',
                      node.state === 'current' && 'border-[var(--em-decision)] bg-[var(--em-surface-subtle)]',
                      node.state === 'waiting' && 'border-[var(--em-border)] bg-[var(--em-surface-subtle)]',
                      expanded && 'ring-2 ring-[var(--em-primary)]',
                    )}
                  >
                    <span className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-full border',
                      node.state === 'completed' && 'border-emerald-700 bg-emerald-700 text-white',
                      node.state === 'current' && 'border-blue-700 bg-blue-700 text-white',
                      node.state === 'waiting' && 'border-[var(--em-border-strong)] bg-[var(--em-surface)] text-[var(--em-muted-ink)]',
                    )}>
                      {node.state === 'completed'
                        ? <Check className='h-4 w-4' />
                        : node.state === 'current'
                          ? <Circle className='h-2.5 w-2.5 fill-current' />
                          : <LockKeyhole className='h-3.5 w-3.5' />}
                    </span>
                    <span className='min-w-0'>
                      <span className='block text-sm font-semibold text-[var(--em-ink)]'>{node.label}</span>
                      <span className='mt-1 block text-xs leading-5 text-[var(--em-muted-ink)]'>{node.description}</span>
                      <span className='mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--em-primary)]'>
                        <Clock3 className='h-3 w-3' />
                        {expanded ? '收起记录' : '查看记录'}
                      </span>
                    </span>
                    <span className='sr-only'>第 {index + 1} 步</span>
                  </button>
                </li>
              );
            })}
          </ol>

          {expandedStage && (
            <section
              id={`journey-record-${expandedStage}`}
              aria-label={`${journey.find(node => node.id === expandedStage)?.label}阶段记录`}
              className='mt-4 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-4'
            >
              <h3 className='mb-3 text-sm font-semibold text-[var(--em-ink)]'>
                {journey.find(node => node.id === expandedStage)?.label} · 输入与结果
              </h3>
              <StageRecord
                stage={expandedStage as 'diagnosis' | 'plan' | 'learning' | 'validation'}
                diagnosis={diagnosis}
                plan={plan}
                task={currentTask}
                evidence={evidence}
              />
            </section>
          )}
        </>
      )}
    </section>
  );
}
