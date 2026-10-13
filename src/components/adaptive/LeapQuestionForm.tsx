import { useState, type FormEvent } from 'react';
import { ArrowRight, LockKeyhole, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownText } from '@/components/content/MarkdownText';
import { cn } from '@/lib/utils';
import type { LeapAnswer, LeapQuestion } from '@/lib/adaptiveApi';

interface LeapQuestionFormProps {
  question: LeapQuestion;
  label: string;
  independent?: boolean;
  busy: boolean;
  submitLabel: string;
  onSubmit: (answer: LeapAnswer) => void;
}

export function LeapQuestionForm({
  question,
  label,
  independent = false,
  busy,
  submitLabel,
  onSubmit,
}: LeapQuestionFormProps) {
  const [selected, setSelected] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [startedAt] = useState(Date.now);
  const canSubmit =
    question.responseMode === 'choice'
      ? Boolean(selected)
      : Boolean(reasoning.trim());
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const option = question.options.find(item => item.id === selected);
    onSubmit({
      answer: [option?.text, reasoning.trim()].filter(Boolean).join('\n'),
      ...(option ? { optionId: option.id } : {}),
      durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
    });
  };
  return (
    <form
      onSubmit={submit}
      className='rounded-2xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-sm sm:p-7'
    >
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h3 className='flex items-center gap-2 text-sm font-semibold text-[var(--em-primary)]'>
          <MessageSquareText className='h-4 w-4' />
          {label}
        </h3>
        <span className='rounded-lg bg-[var(--em-surface-subtle)] px-2 py-1 font-mono text-[10px] text-[var(--em-muted-ink)]'>
          {question.id}
        </span>
      </div>
      {independent && (
        <p className='mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-800'>
          <LockKeyhole className='h-4 w-4 shrink-0' />
          这一题请独立完成，教学内容已收起。结果将作为无提示学习证据。
        </p>
      )}
      <div className='mt-5 text-base leading-7 text-[var(--em-ink)]'>
        <MarkdownText content={question.prompt} className='text-base leading-7' />
      </div>
      {question.options.length > 0 && (
        <div className='mt-5 space-y-3'>
          {question.options.map((option, index) => (
            <label
              key={option.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm leading-6 transition',
                selected === option.id
                  ? 'border-[var(--em-primary)] bg-[var(--em-primary-subtle)] text-[var(--em-primary)] '
                  : 'border-[var(--em-border)] bg-[var(--em-surface)] text-[var(--em-muted-ink)] hover:border-[var(--em-primary)] hover:bg-[var(--em-primary-subtle)]'
              )}
            >
              <input
                type='radio'
                name={question.id}
                value={option.id}
                checked={selected === option.id}
                disabled={busy}
                onChange={() => setSelected(option.id)}
                className='sr-only'
              />
              <span
                className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-semibold',
                  selected === option.id
                    ? 'bg-[var(--em-action)] text-white'
                    : 'bg-[var(--em-surface-subtle)] text-[var(--em-muted-ink)]'
                )}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span className='min-w-0 pt-0.5'>{option.text}</span>
            </label>
          ))}
        </div>
      )}
      <label
        className='mt-5 block text-xs font-semibold text-[var(--em-muted-ink)]'
        htmlFor={`reason-${question.id}`}
      >
        {question.responseMode === 'choice'
          ? '你的推导过程（选填）'
          : '写下你的答案与推导过程'}
      </label>
      <Textarea
        id={`reason-${question.id}`}
        value={reasoning}
        onChange={event => setReasoning(event.target.value)}
        disabled={busy}
        placeholder='试着说明你为什么这样判断…'
        className='mt-2 min-h-[96px] resize-y rounded-2xl border-[var(--em-border)] bg-[var(--em-surface-subtle)] text-sm'
      />
      <div className='mt-5 flex flex-wrap items-center justify-between gap-3'>
        <p className='text-[11px] text-[var(--em-muted-ink)]'>
          {independent
            ? '提交后查看评分依据与下一步'
            : '答案与推导将关联到这次学习会话'}
        </p>
        <Button type='submit' disabled={!canSubmit || busy}>
          {busy ? '正在记录…' : submitLabel}
          <ArrowRight className='h-4 w-4' />
        </Button>
      </div>
    </form>
  );
}
