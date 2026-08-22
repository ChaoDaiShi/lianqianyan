import { useState } from 'react';
import { Bot, Boxes, Loader2, RefreshCw, Search, Unplug } from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';
import { Button } from '@/components/ui/button';
import { useToolCatalog } from '@/lib/hooks';
import { cn } from '@/lib/utils';

type View = 'agents' | 'tools' | 'retrieval';

const AGENTS = [
  { name: 'Diagnosis Agent', detail: '读取学习画像与诊断服务，解释当前优先关注项。' },
  { name: 'Planner Agent', detail: '读取当前计划，并在明确操作时生成或调整学习计划。' },
  { name: 'Tutor Agent', detail: '结合学习上下文与课程来源完成辅导表达。' },
  { name: 'Assessment Agent', detail: '读取真实练习证据并解释评价结果。' },
];

const VIEW_OPTIONS: Array<{ id: View; label: string }> = [
  { id: 'agents', label: 'Agent' },
  { id: 'tools', label: 'Tool' },
  { id: 'retrieval', label: 'Knowledge Retrieval' },
];

export function CapabilityCenter() {
  const catalog = useToolCatalog();
  const [view, setView] = useState<View>('agents');
  const retrievalTool = catalog.data?.find((tool) => tool.name === 'search_course_knowledge') ?? null;

  return (
    <GlassPanel className="p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600">CAPABILITY CENTER</p>
          <h2 className="mt-1 text-2xl font-bold">能力中心</h2>
          <p className="mt-2 max-w-xl text-xs leading-5 text-[var(--em-muted-ink)]">区分 Agent 协作角色、真实 Tool 目录与课程知识检索边界。</p>
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-violet-100 bg-white/55 p-1" role="tablist" aria-label="能力类型">
          {VIEW_OPTIONS.map((option) => (
            <button key={option.id} type="button" role="tab" aria-selected={view === option.id} onClick={() => setView(option.id)} className={cn('whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400', view === option.id ? 'bg-primary-500 text-white shadow-sm' : 'text-[var(--em-muted-ink)] hover:bg-white')}>{option.label}</button>
          ))}
        </div>
      </div>

      <div className="mt-6" role="tabpanel">
        {view === 'agents' && <div><div className="grid gap-3 sm:grid-cols-2">{AGENTS.map((agent) => <article key={agent.name} className="rounded-[20px] border border-sky-100 bg-white/55 p-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700"><Bot className="h-3 w-3" />AGENT</span><h3 className="mt-3 text-sm font-bold">{agent.name}</h3><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">{agent.detail}</p></article>)}</div><p className="mt-4 text-[11px] leading-5 text-[var(--em-muted-ink)]">四类 Agent 由统一编排层按明确能力路由协作，不表示完全自主的无限协作系统。</p></div>}

        {view === 'tools' && <div>{catalog.loading ? <p className="flex items-center gap-2 rounded-[20px] border border-violet-100 bg-white/55 p-5 text-sm text-[var(--em-muted-ink)]"><Loader2 className="h-4 w-4 animate-spin" />正在读取真实 Tool Catalog…</p> : catalog.error ? <div className="rounded-[20px] border border-amber-100 bg-amber-50/60 p-5"><p className="text-sm text-amber-800">Tool Catalog 暂时没有成功加载，不展示预置工具列表。</p><Button variant="outline" size="sm" className="mt-3 gap-2 rounded-xl" onClick={() => void catalog.refetch()}><RefreshCw className="h-3.5 w-3.5" />重新加载</Button></div> : catalog.data?.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{catalog.data.map((tool) => <article key={tool.name} className="rounded-[20px] border border-violet-100 bg-white/55 p-4"><div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-primary-700"><Boxes className="h-3 w-3" />TOOL</span><span className={cn('rounded-full px-2 py-1 text-[9px] font-semibold', tool.readOnly ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{tool.readOnly ? '只读' : '可写'}</span></div><h3 className="mt-3 break-words text-sm font-bold">{tool.name}</h3><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">{tool.description}</p><p className="mt-3 text-[10px] font-semibold text-primary-600">能力：{tool.capability}</p></article>)}</div> : <p className="rounded-[20px] border border-violet-100 bg-white/55 p-5 text-sm text-[var(--em-muted-ink)]">当前 Tool Catalog 返回空目录。</p>}<div className="mt-4 flex items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50/70 p-4"><Unplug className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" /><div><strong className="text-xs">MCP Extension</strong><p className="mt-1 text-[11px] leading-5 text-[var(--em-muted-ink)]">现有 Tool Registry 可由 stdio MCP Server 复用。本页面只说明扩展边界，不检测或声称 MCP 连接状态。</p></div></div></div>}

        {view === 'retrieval' && <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center"><span className={cn('grid h-20 w-20 place-items-center rounded-[26px]', retrievalTool ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}><Search className="h-8 w-8" /></span><div><span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold', retrievalTool ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>{catalog.loading ? '目录读取中' : retrievalTool ? 'Tool Catalog 已提供' : '当前目录未返回该能力'}</span><h3 className="mt-3 text-lg font-bold">课程知识检索</h3><p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">{retrievalTool?.description ?? '等待真实 Tool Catalog 返回 search_course_knowledge 后再确认可用目录。'}</p><p className="mt-2 text-xs text-[var(--em-muted-ink)]">检索范围限定在已有课程内容，并可在辅导回答中展示课程来源。</p></div></div>}
      </div>
    </GlassPanel>
  );
}
