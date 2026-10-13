import { ArrowRight, Lightbulb, MoveRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LeapTeaching } from '@/lib/adaptiveApi';

export function LeapTeachingView({
  teaching,
  topicId,
  busy,
  probeUnavailable = false,
  onProbe,
}: {
  teaching: LeapTeaching;
  topicId: string;
  busy: boolean;
  probeUnavailable?: boolean;
  onProbe: () => void;
}) {
  return (
    <section className='overflow-hidden rounded-2xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 sm:p-7'>
      <p className='flex items-center gap-2 text-xs font-semibold text-[var(--em-primary)]'>
        <Play className='h-4 w-4' />
        小涟的针对性教学
      </p>
      <h2 className='mt-3 text-xl font-bold leading-8 text-[var(--em-ink)]'>
        {teaching.title}
      </h2>
      <p className='mt-2 text-sm leading-7 text-[var(--em-muted-ink)]'>
        {teaching.introduction}
      </p>
      {topicId === 'linked-list' && <LinkedListComparison />}
      <div className='mt-5 grid gap-4 sm:grid-cols-2'>
        {teaching.panels.map((panel, index) => (
          <article
            key={`${panel.label}-${index}`}
            className={`rounded-2xl border p-5 ${index % 2 === 0 ? 'border-[var(--em-border)] bg-[var(--em-primary-subtle)]' : 'border-sky-100 bg-sky-50'}`}
          >
            <p className='text-[11px] font-semibold tracking-wide text-[var(--em-muted-ink)]'>
              {panel.label}
            </p>
            <h3 className='mt-2 text-base font-bold text-[var(--em-ink)]'>
              {panel.title}
            </h3>
            {panel.complexity && (
              <p className='my-3 font-mono text-3xl font-semibold tracking-tight text-[var(--em-primary)]'>
                {panel.complexity}
              </p>
            )}
            <p className='mt-3 whitespace-pre-line text-sm leading-7 text-[var(--em-muted-ink)]'>
              {panel.body}
            </p>
            {panel.steps && (
              <ol className='mt-3 space-y-2'>
                {panel.steps.map((step, i) => (
                  <li
                    key={i}
                    className='flex gap-2 text-xs leading-6 text-[var(--em-muted-ink)]'
                  >
                    <span className='text-[var(--em-primary)]'>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </div>
      {teaching.steps.length > 0 && (
        <div className='mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-4'>
          {teaching.steps.map((step, i) => (
            <p
              key={i}
              className='flex items-start gap-3 text-sm leading-6 text-[var(--em-muted-ink)]'
            >
              <span className='grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--em-surface)] text-[10px] font-bold text-[var(--em-primary)] shadow-sm'>
                {i + 1}
              </span>
              {step}
            </p>
          ))}
        </div>
      )}
      <div className='mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4'>
        <Lightbulb className='mt-0.5 h-5 w-5 shrink-0 text-amber-500' />
        <div>
          <p className='text-xs font-bold text-amber-800'>先用自己的话想一想</p>
          <p className='mt-1 text-sm leading-6 text-amber-900'>
            {teaching.reflectionPrompt}
          </p>
        </div>
      </div>
      <div className='mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--em-border)] pt-5'>
        <p className='text-xs text-[var(--em-muted-ink)]'>
          {probeUnavailable ? '本主题当前没有未见过的独立验证题。' : '听懂讲解后，用一道新题确认理解。'}
        </p>
        <Button onClick={onProbe} disabled={busy || probeUnavailable}>
          {probeUnavailable ? '暂无新验证题' : '完成讲解，独立验证'}
          <ArrowRight className='h-4 w-4' />
        </Button>
      </div>
    </section>
  );
}

function LinkedListComparison() {
  return (
    <div
      className='mt-5 overflow-hidden rounded-2xl border border-[var(--em-border)] p-4 sm:p-5'
      aria-label='链表插入的定位与指针修改示意'
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-[11px] font-semibold text-[var(--em-muted-ink)]'>
          把一次插入拆成两步
        </p>
        <p className='font-mono text-[10px] text-[var(--em-muted-ink)]'>
          T(insert) = T(locate) + T(link)
        </p>
      </div>
      <div className='mt-5 flex items-center justify-center gap-1.5 sm:gap-3'>
        {['head', 'A', 'B', 'C'].map((node, index) => (
          <div className='flex items-center gap-1.5 sm:gap-3' key={node}>
            <div
              className={`relative grid h-12 w-12 place-items-center rounded-xl border font-mono text-sm font-semibold sm:h-14 sm:w-16 ${index === 2 ? 'border-[var(--em-primary)] bg-[var(--em-primary-subtle)] text-[var(--em-primary)]' : 'border-[var(--em-border)] bg-[var(--em-surface)] text-[var(--em-muted-ink)]'}`}
            >
              {node}
              {index === 2 && (
                <span className='absolute -top-4 whitespace-nowrap text-[9px] font-sans font-medium text-[var(--em-primary)]'>
                  前驱节点
                </span>
              )}
            </div>
            {index < 3 && (
              <MoveRight className='h-4 w-4 text-[var(--em-primary)] sm:h-5 sm:w-5' />
            )}
          </div>
        ))}
        <span className='ml-1 font-mono text-[10px] text-[var(--em-muted-ink)]'>null</span>
      </div>
      <div className='mt-5 grid grid-cols-2 gap-3'>
        <p className='rounded-lg bg-[var(--em-surface)] p-2.5 text-center text-[11px] text-[var(--em-muted-ink)]'>
          <span className='font-semibold text-[var(--em-primary)]'>已知 B</span> →
          直接改指针 <strong className='font-mono'>O(1)</strong>
        </p>
        <p className='rounded-lg bg-[var(--em-surface)] p-2.5 text-center text-[11px] text-[var(--em-muted-ink)]'>
          <span className='font-semibold text-sky-600'>仅知道序号</span> →
          先遍历 <strong className='font-mono'>O(n)</strong>
        </p>
      </div>
    </div>
  );
}
