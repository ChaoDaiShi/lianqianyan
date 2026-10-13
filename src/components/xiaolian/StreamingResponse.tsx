import {
  AlertCircle,
  Bot,
  Check,
  Circle,
  LoaderCircle,
  RotateCcw,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownText } from '@/components/content/MarkdownText';
import type { AgentStreamStage, AgentStreamState } from '@/lib/agentStream';
import { cn } from '@/lib/utils';

interface StreamingResponseProps {
  state: AgentStreamState;
  onStop(): void;
  onRetry(): void;
}

function StageIcon({ stage }: { stage: AgentStreamStage }) {
  if (stage.state === 'completed') return <Check className="h-3.5 w-3.5" />;
  if (stage.state === 'error') return <AlertCircle className="h-3.5 w-3.5" />;
  return <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />;
}

const STATUS_LABEL = {
  streaming: '正在生成回答',
  complete: '回答已完成',
  error: '连接中断',
  cancelled: '已停止生成',
} as const;

export function StreamingResponse({ state, onStop, onRetry }: StreamingResponseProps) {
  const dataState = state.status === 'streaming' ? 'active' : state.status;
  const canRetry = state.status === 'error' || state.status === 'cancelled';

  return (
    <section
      data-streaming-response={dataState}
      aria-live="polite"
      aria-busy={state.status === 'streaming'}
      className={cn(
        'overflow-hidden rounded-xl border bg-[var(--em-surface)] p-4 sm:p-5',
        state.status === 'error' ? 'border-rose-300' : 'border-[var(--em-border)]',
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] text-[var(--em-ink)]">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--em-ink)]">回答生成过程</p>
            <p className="text-sm text-[var(--em-muted-ink)]">{state.activeLabel ?? STATUS_LABEL[state.status]}</p>
          </div>
        </div>
        {state.status === 'streaming' && (
          <Button type="button" variant="outline" size="sm" onClick={onStop} className="h-9 rounded-lg px-3">
            <Square className="h-3.5 w-3.5 fill-current" />
            停止生成
          </Button>
        )}
        {canRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="h-9 rounded-lg px-3">
            <RotateCcw className="h-3.5 w-3.5" />
            重新生成
          </Button>
        )}
      </header>

      {state.stages.length > 0 && (
        <ol className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="回答生成阶段">
          {state.stages.map((stage) => (
            <li
              key={stage.stage}
              data-stream-stage={stage.stage}
              data-stream-stage-state={stage.state}
              className={cn(
                'flex min-w-fit items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm',
                stage.state === 'completed' && 'border-[var(--em-border)] bg-[var(--em-surface-subtle)] text-[var(--em-ink)]',
                stage.state === 'active' && 'border-[var(--em-primary)] bg-[var(--em-primary-subtle)] text-[var(--em-primary)]',
                stage.state === 'error' && 'border-rose-300 bg-rose-50 text-rose-900',
              )}
            >
              <StageIcon stage={stage} />
              {stage.label}
            </li>
          ))}
        </ol>
      )}

      {state.trace.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="已完成的协作步骤">
          {state.trace.map((item, index) => (
            <li
              key={`${item.type}-${item.name ?? item.agent}-${index}`}
              className="rounded-md border border-[var(--em-border)] bg-[var(--em-surface-subtle)] px-2.5 py-1.5 text-xs text-[var(--em-ink)]"
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 text-[15px] leading-7 text-[var(--em-ink)] sm:text-base sm:leading-7">
        {state.text ? (
          <div><MarkdownText content={state.text} /></div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-[var(--em-muted-ink)]">
            <Circle className="h-2.5 w-2.5 fill-current" />
            正在建立回答上下文…
          </p>
        )}
      </div>

      {state.error && <p role="alert" className="mt-3 text-sm leading-6 text-rose-800">{state.error}</p>}
      {state.status === 'cancelled' && (
        <p className="mt-3 text-sm leading-6 text-[var(--em-ink)]">
          已停止生成；已收到的内容会保留，但不会保存为完整回答。
        </p>
      )}
    </section>
  );
}
