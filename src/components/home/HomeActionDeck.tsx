import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Clock3,
  Loader2,
  ListChecks,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type {
  DiagnosisResult,
  PersistedStudyPlan,
  PersistedStudyTask,
} from '@/domain';
import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import { Button } from '@/components/ui/button';
import { ACTIVE_COURSE_ID } from '@/store';
import { hasRecordedDiagnosis } from './homePresentation';

interface HomeActionDeckProps {
  diagnosis: DiagnosisResult | null;
  plan: PersistedStudyPlan | null;
  task: PersistedStudyTask | null;
  evidenceCount: number;
  loading: boolean;
  error: boolean;
  generating: boolean;
  starting: boolean;
  startError?: string | null;
  onGeneratePlan: () => void;
  onPrepareTask: () => void;
  onRetry: () => void;
}

export function HomeActionDeck({
  diagnosis,
  plan,
  task,
  evidenceCount,
  loading,
  error,
  generating,
  starting,
  startError,
  onGeneratePlan,
  onPrepareTask,
  onRetry,
}: HomeActionDeckProps) {
  const focus = diagnosis?.primaryFocus;
  const diagnosed = hasRecordedDiagnosis(diagnosis);

  return (
    <section className='rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)] sm:p-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='text-lg font-semibold text-[var(--em-ink)]'>
            今日学习任务
          </h2>
          <p className='mt-1 text-sm leading-6 text-[var(--em-muted-ink)]'>
            基于当前诊断和已保存计划安排下一步。
          </p>
        </div>
        <span className='inline-flex items-center gap-1.5 rounded-lg bg-[var(--em-surface-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--em-muted-ink)]'>
          <ListChecks className='h-3.5 w-3.5' />
          {plan ? `${plan.tasks.length} 项计划任务` : '尚无学习计划'}
        </span>
      </div>

      {loading && (
        <p role='status' className='mt-5 flex items-center gap-2 text-sm text-[var(--em-muted-ink)]'>
          <Loader2 className='h-4 w-4 animate-spin' />
          正在读取当前课程的真实学习数据…
        </p>
      )}

      {!loading && error && (
        <div role='alert' className='mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4'>
          <p className='flex items-center gap-2 text-sm font-medium text-amber-900'>
            <AlertTriangle className='h-4 w-4' />
            首页学习数据没有完整加载。
          </p>
          <Button variant='outline' size='sm' className='mt-3' onClick={onRetry}>
            重新加载
          </Button>
        </div>
      )}

      {!loading && !error && task && plan && (
        <div className='mt-5 grid gap-5 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5'>
          <div className='min-w-0'>
            <p className='text-xs font-medium text-[var(--em-muted-ink)]'>
              任务 {task.order} / {plan.tasks.length}
            </p>
            <h3 className='mt-1.5 text-base font-semibold text-[var(--em-ink)]'>
              {task.knowledgePointName}
            </h3>
            <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--em-muted-ink)]'>
              <span>{DIAGNOSIS_STATUS_LABEL[task.sourceStatus]}</span>
              <span aria-hidden='true'>·</span>
              <span className='inline-flex items-center gap-1'>
                <Clock3 className='h-3.5 w-3.5' />
                预计 {task.estimatedMinutes} 分钟
              </span>
            </div>
            {focus?.knowledgePointId === task.knowledgePointId && (
              <p className='mt-2 text-xs text-[var(--em-muted-ink)]'>
                诊断掌握度 {Math.round(focus.masteryScore * 100)}% · {focus.evidenceCount} 条评价证据
              </p>
            )}
          </div>
          <Button className='gap-2' disabled={starting} onClick={onPrepareTask}>
            {starting ? <Loader2 className='h-4 w-4 animate-spin' /> : <ArrowRight className='h-4 w-4' />}
            {starting ? '正在准备…' : '进入学习任务'}
          </Button>
        </div>
      )}

      {!loading && !error && !task && !diagnosed && (
        <div className='mt-5 flex flex-col gap-4 rounded-lg border border-[var(--em-primary)] bg-[var(--em-primary-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5'>
          <div className='flex items-start gap-3'>
            <span className='grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--em-surface)] text-[var(--em-primary)]'>
              <BookOpenCheck className='h-4.5 w-4.5' />
            </span>
            <div>
              <h3 className='text-base font-semibold text-[var(--em-ink)]'>尚未完成课程诊断</h3>
              <p className='mt-1 max-w-xl text-sm leading-6 text-[var(--em-muted-ink)]'>
                {evidenceCount > 0
                  ? `已有 ${evidenceCount} 条学习行为记录；它们不代表诊断结果。`
                  : '欢迎进入学习空间。先完成一次 5 分钟快速水平摸底诊断。'}
                {' '}完成诊断后，系统会根据真实作答安排学习任务。
              </p>
            </div>
          </div>
          <Button asChild className='shrink-0 gap-2'>
            <Link to={ACTIVE_COURSE_ID === 'course-ds' ? '/adaptive' : '/exams'}>
              开始诊断
              <ArrowRight className='h-4 w-4' />
            </Link>
          </Button>
        </div>
      )}

      {!loading && !error && !task && diagnosed && (
        <div className='mt-5 flex flex-col gap-4 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5'>
          <div>
            <h3 className='text-base font-semibold text-[var(--em-ink)]'>
              {plan ? '当前计划没有待执行任务' : '诊断已记录，尚未生成计划'}
            </h3>
            <p className='mt-1 text-sm leading-6 text-[var(--em-muted-ink)]'>
              {focus
                ? `当前诊断重点：${focus.knowledgePointName}。`
                : `已保存 ${evidenceCount} 条学习证据，暂无可显示的优先薄弱项。`}
              {' '}可以根据现有诊断生成一份学习计划。
            </p>
          </div>
          <Button className='shrink-0 gap-2' disabled={generating} onClick={onGeneratePlan}>
            {generating ? <Loader2 className='h-4 w-4 animate-spin' /> : <Plus className='h-4 w-4' />}
            {generating ? '正在生成…' : '生成学习计划'}
          </Button>
        </div>
      )}

      {startError && <p role='alert' className='mt-3 text-sm text-amber-800'>{startError}</p>}
    </section>
  );
}
