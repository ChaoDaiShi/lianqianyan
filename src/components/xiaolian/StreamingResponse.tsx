import {
  AlertCircle,
  Bot,
  Check,
  Circle,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Square,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownText } from '@/components/content/MarkdownText';
import type {
  AgentStreamStage,
  AgentStreamState,
} from '@/lib/agentStream';
import { cn } from '@/lib/utils';

interface StreamingResponseProps {
  state: AgentStreamState;
  onStop(): void;
  onRetry(): void;
}

function StageIcon({ stage }: { stage: AgentStreamStage }) {
  if (stage.state === 'completed') return <Check className="h-3 w-3" />;
  if (stage.state === 'error') return <AlertCircle className="h-3 w-3" />;
  return <LoaderCircle className="h-3 w-3 animate-spin motion-reduce:animate-none" />;
}

const STATUS_LABEL = {
  streaming: '正在生成回答',
  complete: '回答已完成',
  error: '连接中断',
  cancelled: '已停止生成',
} as const;

export function StreamingResponse({
  state,
  onStop,
  onRetry,
}: StreamingResponseProps) {
  const dataState = state.status === 'streaming' ? 'active' : state.status;
  const canRetry = state.status === 'error' || state.status === 'cancelled';

  return (
    <section
      data-streaming-response={dataState}
      aria-live="polite"
      aria-busy={state.status === 'streaming'}
      className={cn(
        'relative overflow-hidden rounded-[24px] border px-4 py-4 shadow-[0_14px_36px_rgba(76,62,132,0.08)]',
        state.status === 'error'
          ? 'border-rose-200 bg-rose-50/55'
          : state.status === 'cancelled'
            ? 'border-amber-200 bg-amber-50/55'
            : 'border-violet-100 bg-white/72',
      )}
    >
      {state.status === 'streaming' && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary-400 to-transparent"
        />
      )}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-100 to-sky-100 text-primary-700">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-primary-600">
              XIAOLIAN COLLABORATION
            </p>
            <p className="text-xs font-semibold text-[var(--em-ink)]">
              {state.activeLabel ?? STATUS_LABEL[state.status]}
            </p>
          </div>
        </div>
        {state.status === 'streaming' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onStop}
            className="h-8 gap-1.5 rounded-full px-3 text-[11px]"
          >
            <Square className="h-3 w-3 fill-current" />
            停止生成
          </Button>
        )}
        {canRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-8 gap-1.5 rounded-full px-3 text-[11px]"
          >
            <RotateCcw className="h-3 w-3" />
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
                'flex min-w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium',
                stage.state === 'completed' &&
                  'border-emerald-100 bg-emerald-50/70 text-emerald-700',
                stage.state === 'active' &&
                  'border-primary-200 bg-violet-50 text-primary-700',
                stage.state === 'error' &&
                  'border-rose-200 bg-rose-50 text-rose-700',
              )}
            >
              <StageIcon stage={stage} />
              {stage.label}
            </li>
          ))}
        </ol>
      )}

      {state.trace.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="已完成的协作步骤">
          {state.trace.map((item, index) => (
            <span
              key={`${item.type}-${item.name ?? item.agent}-${index}`}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-100 bg-white/72 px-2 py-1 text-[9px] font-medium text-[var(--em-muted-ink)]"
            >
              {item.type === 'tool' ? (
                <Wrench className="h-2.5 w-2.5 text-primary-600" />
              ) : (
                <Bot className="h-2.5 w-2.5 text-sky-600" />
              )}
              {item.label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 text-sm leading-7 text-[var(--em-ink)]">
        {state.text ? (
          <div className="relative">
            <MarkdownText content={state.text} />
            {state.status === 'streaming' && (
              <span
                aria-hidden="true"
                className="em-stream-caret ml-1 inline-block h-[1.05em] w-0.5 translate-y-[0.14em] rounded-full bg-primary-500 align-baseline"
              />
            )}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-[var(--em-muted-ink)]">
            <Circle className="h-2.5 w-2.5 fill-primary-400 text-primary-400" />
            正在建立回答上下文…
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="mt-3 text-xs leading-5 text-rose-700">
          {state.error}
        </p>
      )}
      {state.status === 'cancelled' && (
        <p className="mt-3 text-xs leading-5 text-amber-700">
          已停止生成；已收到的内容会保留，但不会保存为完整回答。
        </p>
      )}
    </section>
  );
}
