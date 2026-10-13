import { ArrowRight, Lightbulb, MoveRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LeapTeaching } from '@/lib/adaptiveApi';

export function LeapTeachingView({
  teaching,
  topicId,
  busy,
  onProbe,
}: {
  teaching: LeapTeaching;
  topicId: string;
  busy: boolean;
  onProbe: () => void;
}) {
  return (
    <section className='overflow-hidden rounded-[26px] border border-violet-100 bg-white/90 p-5 sm:p-7'>
      <p className='flex items-center gap-2 text-xs font-semibold text-violet-600'>
        <Play className='h-4 w-4' />
        小涟的针对性教学
      </p>
      <h2 className='mt-3 text-xl font-bold leading-8 text-slate-800'>
        {teaching.title}
      </h2>
      <p className='mt-2 text-sm leading-7 text-slate-500'>
        {teaching.introduction}
      </p>
      {topicId === 'linked-list' && <LinkedListComparison />}
      <div className='mt-5 grid gap-4 sm:grid-cols-2'>
        {teaching.panels.map((panel, index) => (
          <article
            key={`${panel.label}-${index}`}
            className={`rounded-2xl border p-5 ${index % 2 === 0 ? 'border-violet-100 bg-violet-50/60' : 'border-sky-100 bg-sky-50/60'}`}
          >
            <p className='text-[11px] font-semibold tracking-wide text-slate-500'>
              {panel.label}
            </p>
            <h3 className='mt-2 text-base font-bold text-slate-800'>
              {panel.title}
            </h3>
            {panel.complexity && (
              <p className='my-3 font-mono text-3xl font-semibold tracking-tight text-violet-600'>
                {panel.complexity}
              </p>
            )}
            <p className='mt-3 whitespace-pre-line text-sm leading-7 text-slate-600'>
              {panel.body}
            </p>
            {panel.steps && (
              <ol className='mt-3 space-y-2'>
                {panel.steps.map((step, i) => (
                  <li
                    key={i}
                    className='flex gap-2 text-xs leading-6 text-slate-500'
                  >
                    <span className='text-violet-500'>
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
        <div className='mt-5 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4'>
          {teaching.steps.map((step, i) => (
            <p
              key={i}
              className='flex items-start gap-3 text-sm leading-6 text-slate-600'
            >
              <span className='grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[10px] font-bold text-violet-500 shadow-sm'>
                {i + 1}
              </span>
              {step}
            </p>
          ))}
        </div>
      )}
      <div className='mt-5 flex items-start gap-3 rounded-2xl bg-amber-50/80 p-4'>
        <Lightbulb className='mt-0.5 h-5 w-5 shrink-0 text-amber-500' />
        <div>
          <p className='text-xs font-bold text-amber-800'>先用自己的话想一想</p>
          <p className='mt-1 text-sm leading-6 text-amber-900/70'>
            {teaching.reflectionPrompt}
          </p>
        </div>
      </div>
      <div className='mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5'>
        <p className='text-xs text-slate-400'>
          听懂讲解后，用一道新题确认理解。
        </p>
        <Button onClick={onProbe} disabled={busy}>
          完成讲解，独立验证
          <ArrowRight className='h-4 w-4' />
        </Button>
      </div>
    </section>
  );
}

function LinkedListComparison() {
  return (
    <div
      className='mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/70 to-sky-50/70 p-4 sm:p-5'
      aria-label='链表插入的定位与指针修改示意'
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-[11px] font-semibold text-slate-500'>
          把一次插入拆成两步
        </p>
        <p className='font-mono text-[10px] text-slate-400'>
          T(insert) = T(locate) + T(link)
        </p>
      </div>
      <div className='mt-5 flex items-center justify-center gap-1.5 sm:gap-3'>
        {['head', 'A', 'B', 'C'].map((node, index) => (
          <div className='flex items-center gap-1.5 sm:gap-3' key={node}>
            <div
              className={`relative grid h-12 w-12 place-items-center rounded-xl border font-mono text-sm font-semibold sm:h-14 sm:w-16 ${index === 2 ? 'border-violet-400 bg-violet-100 text-violet-700' : 'border-slate-200 bg-white text-slate-500'}`}
            >
              {node}
              {index === 2 && (
                <span className='absolute -top-4 whitespace-nowrap text-[9px] font-sans font-medium text-violet-500'>
                  前驱节点
                </span>
              )}
            </div>
            {index < 3 && (
              <MoveRight className='h-4 w-4 text-violet-300 sm:h-5 sm:w-5' />
            )}
          </div>
        ))}
        <span className='ml-1 font-mono text-[10px] text-slate-400'>null</span>
      </div>
      <div className='mt-5 grid grid-cols-2 gap-3'>
        <p className='rounded-lg bg-white/80 p-2.5 text-center text-[11px] text-slate-600'>
          <span className='font-semibold text-violet-600'>已知 B</span> →
          直接改指针 <strong className='font-mono'>O(1)</strong>
        </p>
        <p className='rounded-lg bg-white/80 p-2.5 text-center text-[11px] text-slate-600'>
          <span className='font-semibold text-sky-600'>仅知道序号</span> →
          先遍历 <strong className='font-mono'>O(n)</strong>
        </p>
      </div>
    </div>
  );
}
