import { useMemo, useState } from 'react';
import { Loader2, RefreshCw, Share2 } from 'lucide-react';
import type { KnowledgeGraphData, KnowledgeGraphNode } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';

interface KnowledgeGraphProps {
  graph: KnowledgeGraphData | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

const RELATION_LABEL = {
  contains: '包含',
  explains: '解释',
  precedes: '先后',
} as const;

function positions(nodes: KnowledgeGraphNode[]) {
  const byKind = {
    course: nodes.filter((node) => node.kind === 'course'),
    knowledge_point: nodes.filter((node) => node.kind === 'knowledge_point'),
    section: nodes.filter((node) => node.kind === 'section'),
  };
  const result = new Map<string, { x: number; y: number }>();
  (Object.entries(byKind) as Array<[keyof typeof byKind, KnowledgeGraphNode[]]>).forEach(([kind, items]) => {
    const y = kind === 'course' ? 70 : kind === 'knowledge_point' ? 240 : 430;
    items.forEach((node, index) => {
      result.set(node.id, { x: ((index + 1) * 1000) / (items.length + 1), y });
    });
  });
  return result;
}

export function KnowledgeGraph({ graph, loading, error, onRetry }: KnowledgeGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const nodePositions = useMemo(() => positions(graph?.nodes ?? []), [graph]);
  const selected = graph?.nodes.find((node) => node.id === selectedId) ?? graph?.nodes[0] ?? null;

  if (loading) return <div className="rounded-[28px] border border-violet-100 bg-white/55 p-8 text-center text-sm text-[var(--em-muted-ink)]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /><p className="mt-2">昔涟教官正在生成课程知识图谱…</p></div>;
  if (error) return <div className="rounded-[28px] border border-amber-100 bg-amber-50/60 p-8 text-center"><p className="text-sm text-amber-800">知识图谱暂时无法读取。</p><Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-3 gap-2"><RefreshCw className="h-3.5 w-3.5" />重试</Button></div>;
  if (!graph || graph.nodes.length === 0) return <div className="rounded-[28px] border border-dashed border-violet-200 bg-white/45 p-8 text-center text-sm text-[var(--em-muted-ink)]">当前课程没有可生成图谱的材料。</div>;

  return <div className="space-y-4">
    <div className="rounded-[30px] border border-violet-100 bg-[radial-gradient(circle_at_top,rgba(167,139,250,.18),transparent_42%),rgba(255,255,255,.58)] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold text-primary-700"><Share2 className="h-4 w-4" />课程材料知识图谱</p><p className="mt-1 text-[10px] text-[var(--em-muted-ink)]">课程材料生成 · {graph.nodes.length} 节点 · {graph.edges.length} 关系</p></div><div className="flex gap-1.5">{Object.entries(RELATION_LABEL).map(([key, label]) => <span key={key} className="rounded-full border border-violet-100 bg-white/75 px-2 py-1 text-[10px]">{label}</span>)}</div></div>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox="0 0 1000 520" role="img" aria-label="课程知识图谱" className="min-w-[820px]">
          {graph.edges.map((edge) => {
            const source = nodePositions.get(edge.source);
            const target = nodePositions.get(edge.target);
            if (!source || !target) return null;
            return <g key={edge.id}><line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={edge.relation === 'precedes' ? '#f59e0b' : '#c4b5fd'} strokeWidth="2" strokeDasharray={edge.relation === 'precedes' ? '7 5' : undefined} /><text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 6} textAnchor="middle" fontSize="11" fill="#786a91">{RELATION_LABEL[edge.relation]}</text></g>;
          })}
          {graph.nodes.map((node) => {
            const point = nodePositions.get(node.id);
            if (!point) return null;
            const width = node.kind === 'section' ? 120 : 150;
            return <g key={node.id} role="button" tabIndex={0} aria-label={`${node.label}，${node.kind}`} onClick={() => setSelectedId(node.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(node.id); }} className="cursor-pointer"><rect x={point.x - width / 2} y={point.y - 30} width={width} height="60" rx="18" fill={selected?.id === node.id ? '#ede9fe' : node.kind === 'course' ? '#f5f3ff' : node.kind === 'knowledge_point' ? '#eff6ff' : '#ffffff'} stroke={selected?.id === node.id ? '#8b5cf6' : '#d8ccf4'} strokeWidth="2" /><text x={point.x} y={point.y + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#44385c">{node.label.length > 12 ? `${node.label.slice(0, 12)}…` : node.label}</text></g>;
          })}
        </svg>
      </div>
    </div>
    {selected && <div className="rounded-[22px] border border-violet-100 bg-white/60 p-4"><p className="text-sm font-bold">{selected.label}</p><p className="mt-1 text-xs text-[var(--em-muted-ink)]">{selected.kind === 'course' ? '课程根节点' : selected.kind === 'knowledge_point' ? '知识点节点' : '课程章节节点'}</p><div className="mt-3 flex flex-wrap gap-1.5">{selected.sourceSections.map((source) => <span key={source} className="rounded-full bg-violet-50 px-2 py-1 text-[10px] text-primary-700">{source}</span>)}</div></div>}
    <div className="rounded-[20px] border border-sky-100 bg-sky-50/55 p-4"><p className="text-xs font-bold text-sky-800">来源清单</p><div className="mt-2 flex flex-wrap gap-1.5">{graph.sources.map((source) => <span key={source} className="rounded-full bg-white/80 px-2 py-1 text-[10px] text-sky-800">{source}</span>)}</div></div>
  </div>;
}
