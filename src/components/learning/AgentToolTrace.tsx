import { ChevronDown } from 'lucide-react';
import type { AgentTraceItem, KnowledgeSource } from '@/lib/educationApi';
import { SourceReferences } from './SourceReferences';

interface AgentToolTraceProps {
  items: AgentTraceItem[];
  sources?: KnowledgeSource[];
  compact?: boolean;
}

function Timeline({ items }: { items: AgentTraceItem[] }) {
  return (
    <ol className="mt-3 divide-y divide-slate-200" aria-label="Agent 与工具执行记录">
      {items.map((item, index) => (
        <li
          key={`${item.type}-${item.name ?? item.agent}-${index}`}
          className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,.65fr)_auto] sm:items-center sm:gap-4"
        >
          <span className="text-sm font-medium text-[var(--em-ink)]">{item.label}</span>
          <code className="break-all font-mono text-xs text-[var(--em-ink)]">
            {item.type === 'tool' ? item.name ?? item.agent : item.agent}
          </code>
          <span className="text-xs text-[var(--em-muted-ink)]">{item.status}</span>
        </li>
      ))}
    </ol>
  );
}

export function AgentToolTrace({
  items,
  sources = [],
  compact = false,
}: AgentToolTraceProps) {
  if (items.length === 0 && sources.length === 0) return null;
  const summary = [
    `执行审计 ${items.length} 项`,
    sources.length > 0 ? `课程来源 ${sources.length} 项` : null,
  ].filter(Boolean).join(' · ');

  return (
    <details
      data-agent-trace="timeline"
      data-compact={compact ? 'true' : 'false'}
      className="group mt-3 border-t border-[var(--em-border)] pt-3"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] px-3 py-2 text-sm font-medium text-[var(--em-ink)]">
        <span>{summary}</span>
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="mt-2 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] px-4">
        {items.length > 0 && <Timeline items={items} />}
        {sources.length > 0 && <SourceReferences sources={sources} />}
      </div>
    </details>
  );
}
