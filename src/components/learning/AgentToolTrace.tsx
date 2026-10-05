import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { AgentTraceItem, KnowledgeSource } from '@/lib/educationApi';
import { cn } from '@/lib/utils';
import { SourceReferences } from './SourceReferences';

interface AgentToolTraceProps {
  items: AgentTraceItem[];
  sources?: KnowledgeSource[];
  compact?: boolean;
}

function Timeline({ items }: { items: AgentTraceItem[] }) {
  return (
    <ol className="space-y-2" aria-label="Agent 与工具执行顺序">
      {items.map((item, index) => {
        const failed = item.status === 'failed';
        const Icon = item.type === 'tool' ? Wrench : Bot;
        return (
          <li
            key={`${item.type}-${item.name ?? item.agent}-${index}`}
            className="relative flex gap-3 pl-0.5"
          >
            {index < items.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[0.78rem] top-6 h-[calc(100%+0.25rem)] w-px bg-violet-100"
              />
            )}
            <span
              className={cn(
                'relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border bg-white',
                failed
                  ? 'border-rose-200 text-rose-600'
                  : item.type === 'tool'
                    ? 'border-violet-200 text-primary-700'
                    : 'border-sky-200 text-sky-700',
              )}
            >
              <Icon className="h-3 w-3" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-semibold text-[var(--em-ink)]">
                  {item.label}
                </span>
                {failed ? (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                )}
              </div>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.11em] text-[var(--em-muted-ink)]">
                {item.type === 'tool' ? item.name ?? item.agent : 'Agent'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TraceContent({
  items,
  sources,
}: {
  items: AgentTraceItem[];
  sources: KnowledgeSource[];
}) {
  return (
    <div className="mt-3">
      {items.length > 0 && <Timeline items={items} />}
      {sources.length > 0 && <SourceReferences sources={sources} />}
    </div>
  );
}

export function AgentToolTrace({
  items,
  sources = [],
  compact = false,
}: AgentToolTraceProps) {
  if (items.length === 0 && sources.length === 0) return null;

  if (compact) {
    return (
      <section
        data-agent-trace="timeline"
        className="rounded-2xl border border-violet-100 bg-violet-50/38 p-4"
      >
        <p className="text-xs font-bold tracking-[0.13em] text-primary-700">
          协作与来源
        </p>
        <TraceContent items={items} sources={sources} />
      </section>
    );
  }

  return (
    <details
      data-agent-trace="timeline"
      className="group mt-3 border-t border-violet-100 pt-3"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl bg-violet-50/60 px-3 py-2 text-[11px] font-semibold text-primary-700">
        <span>
          执行记录 {items.length} 项
          {sources.length > 0 ? ` · 参考 ${sources.length} 个课程来源` : ''}
        </span>
        <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
      </summary>
      <TraceContent items={items} sources={sources} />
    </details>
  );
}
