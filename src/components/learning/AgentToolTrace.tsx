import { Bot, ChevronDown, Wrench } from 'lucide-react';
import type { AgentTraceItem, KnowledgeSource } from '@/lib/educationApi';
import { cn } from '@/lib/utils';
import { SourceReferences } from './SourceReferences';

interface AgentToolTraceProps {
  items: AgentTraceItem[];
  sources?: KnowledgeSource[];
  compact?: boolean;
}

export function AgentToolTrace({ items, sources = [], compact = false }: AgentToolTraceProps) {
  if (items.length === 0 && sources.length === 0) return null;
  const agents = items.filter((item) => item.type === 'agent');
  const tools = items.filter((item) => item.type === 'tool');

  return (
    <details className="group mt-3 border-t border-violet-100 pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl bg-violet-50/60 px-3 py-2 text-[11px] font-semibold text-primary-700">
        <span>执行记录 {items.length} 项{sources.length > 0 ? ` · 参考 ${sources.length} 个课程来源` : ''}</span>
        <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
      </summary>
      <div className={cn('mt-3 space-y-3', compact && 'text-[10px]')}>
        {agents.length > 0 && <section><p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-sky-700"><Bot className="h-3 w-3" />AGENT</p><div className="mt-1.5 flex flex-wrap gap-1.5">{agents.map((item, index) => <span key={`${item.agent}-${index}`} className={cn('rounded-xl border border-sky-100 bg-white/75 px-2.5 py-1 text-[10px] font-semibold text-sky-700', item.status === 'failed' && 'border-red-200 bg-red-50 text-red-600')}>{item.label}</span>)}</div></section>}
        {tools.length > 0 && <section><p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-primary-700"><Wrench className="h-3 w-3" />TOOL</p><div className="mt-1.5 flex flex-wrap gap-1.5">{tools.map((item, index) => <span key={`${item.name ?? item.agent}-${index}`} className={cn('rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-mono text-[9px] text-primary-700', item.status === 'failed' && 'border-red-200 bg-red-50 text-red-600')}>{item.name ?? item.label}</span>)}</div></section>}
        {sources.length > 0 && <section><p className="text-[10px] font-bold tracking-wide text-amber-700">SOURCE</p><SourceReferences sources={sources} /></section>}
      </div>
    </details>
  );
}
