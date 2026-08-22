import { Check, Circle, Loader2 } from 'lucide-react';
import type { AgentTraceItem } from '@/lib/educationApi';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/design/GlassPanel';

export type AgentActivityStatus = 'idle' | 'running' | 'completed';

export interface AgentActivityNode {
  id: string;
  label: string;
  status: AgentActivityStatus;
  detail?: string;
}

interface AgentActivityTimelineProps {
  nodes: AgentActivityNode[];
  title?: string;
  compact?: boolean;
  className?: string;
}

export function traceActivityNodes(trace: AgentTraceItem[], pending: boolean): AgentActivityNode[] {
  const nodes: AgentActivityNode[] = trace.map((item, index) => ({
    id: `${item.type}-${item.name ?? item.agent}-${index}`,
    label: item.type === 'tool' ? item.name ?? item.agent : item.label,
    status: item.status === 'failed' ? 'idle' as const : 'completed' as const,
    detail: item.status === 'failed' ? '该节点未成功完成' : item.type === 'tool' ? '真实 Tool 节点' : '真实 Agent 节点',
  }));
  if (pending) nodes.push({ id: 'agent-running', label: '生成建议', status: 'running', detail: '等待当前真实请求返回' });
  return nodes;
}

export function AgentActivityTimeline({ nodes, title = '小涟能力活动', compact = false, className }: AgentActivityTimelineProps) {
  const content = <>
    <div><p className="text-[10px] font-bold tracking-[0.18em] text-primary-600">AGENT ACTIVITY</p><h2 className={cn('mt-1 font-bold', compact ? 'text-sm' : 'text-lg')}>{title}</h2></div>
    <ol className={cn('mt-4', compact ? 'space-y-2' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-5')}>
      {nodes.map((node) => <li key={node.id} className={cn('rounded-[16px] border bg-white/50', compact ? 'flex items-center gap-3 p-2.5' : 'p-3', node.status === 'completed' ? 'border-primary-200' : node.status === 'running' ? 'border-sky-200 bg-sky-50/60' : 'border-slate-200')}>
        <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-xl', node.status === 'completed' ? 'bg-primary-100 text-primary-700' : node.status === 'running' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-400')} aria-label={node.status === 'completed' ? '已完成' : node.status === 'running' ? '运行中' : '等待中'}>{node.status === 'completed' ? <Check className="h-3.5 w-3.5" /> : node.status === 'running' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Circle className="h-3.5 w-3.5" />}</span>
        <div className="min-w-0"><p className="text-xs font-semibold">{node.label}</p>{node.detail && <p className="mt-0.5 text-[10px] leading-4 text-[var(--em-muted-ink)]">{node.detail}</p>}</div>
      </li>)}
    </ol>
    <p className="mt-3 text-[10px] text-[var(--em-muted-ink)]">仅展示能力节点与可验证状态，不展示模型思维过程。</p>
  </>;
  return compact ? <div className={className}>{content}</div> : <GlassPanel className={cn('p-5 sm:p-6', className)}>{content}</GlassPanel>;
}
