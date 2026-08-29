import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { KnowledgePointDiagnosis, PersistedStudyPlan } from '@/domain';
import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import type { KnowledgeGraphData } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';
import {
  buildKnowledgeScene,
  getKnowledgeNodeStatusText,
  type KnowledgeSceneNode,
} from './knowledgePresentation';

interface KnowledgeGalaxyProps {
  graph: KnowledgeGraphData | null;
  points: KnowledgePointDiagnosis[];
  plan: PersistedStudyPlan | null;
  primaryFocusId?: string | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

const RELATION_LABEL = {
  contains: '包含',
  explains: '解释',
  precedes: '先后',
} as const;

const NODE_COLOR = {
  mastered: { fill: '#10b981', stroke: '#6ee7b7' },
  proficient: { fill: '#38bdf8', stroke: '#7dd3fc' },
  developing: { fill: '#8b5cf6', stroke: '#c4b5fd' },
  weak: { fill: '#e879f9', stroke: '#f0abfc' },
  insufficient_evidence: { fill: '#94a3b8', stroke: '#cbd5e1' },
  unassessed: { fill: '#d4d4d8', stroke: '#e4e4e7' },
} as const;

function canvasWidth(knowledgePointCount: number) {
  return Math.max(980, knowledgePointCount * 165);
}

function layoutNodes(nodes: KnowledgeSceneNode[], width: number) {
  const result = new Map<string, { x: number; y: number }>();
  const course = nodes.filter((node) => node.kind === 'course');
  const points = nodes.filter((node) => node.kind === 'knowledge_point');
  const sections = nodes.filter((node) => node.kind === 'section');
  course.forEach((node, index) => result.set(node.id, { x: ((index + 1) * width) / (course.length + 1), y: 76 }));
  points.forEach((node, index) => result.set(node.id, { x: ((index + 1) * width) / (points.length + 1), y: 245 + (index % 2) * 42 }));
  sections.forEach((node, index) => result.set(node.id, { x: ((index + 1) * width) / (sections.length + 1), y: 450 }));
  return result;
}

function nodeRadius(node: KnowledgeSceneNode, selected: boolean) {
  if (selected) return 34;
  if (node.kind === 'course') return 30;
  if (node.inCurrentPlan) return 27;
  if (node.kind === 'knowledge_point') return 22;
  return 15;
}

export function KnowledgeGalaxy({ graph, points, plan, primaryFocusId, loading, error, onRetry }: KnowledgeGalaxyProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scene = useMemo(
    () => graph ? buildKnowledgeScene({ graph, points, plan }) : null,
    [graph, plan, points],
  );
  const fallbackSelected = scene?.nodes.find((node) => node.knowledgePointId === primaryFocusId)
    ?? scene?.nodes.find((node) => node.kind === 'knowledge_point' && node.inCurrentPlan)
    ?? scene?.nodes.find((node) => node.kind === 'knowledge_point')
    ?? scene?.nodes[0]
    ?? null;
  const selected = scene?.nodes.find((node) => node.id === selectedId) ?? fallbackSelected;
  const activeKnowledgePointId = selected?.knowledgePointId ?? null;
  const visibleNodes = useMemo(
    () => (scene?.nodes ?? []).filter((node) => node.kind !== 'section' || node.knowledgePointId === activeKnowledgePointId),
    [activeKnowledgePointId, scene],
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => (scene?.edges ?? []).filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    [scene, visibleIds],
  );
  const width = canvasWidth(visibleNodes.filter((node) => node.kind === 'knowledge_point').length);
  const positions = useMemo(() => layoutNodes(visibleNodes, width), [visibleNodes, width]);
  const attentionPoints = points.filter((point) => point.status === 'weak' || point.status === 'unassessed' || point.status === 'insufficient_evidence');

  if (loading) return <div className="rounded-[2rem] border border-violet-100 bg-white/55 p-10 text-sm text-[var(--em-muted-ink)]"><p className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />正在读取课程关系与学习状态…</p></div>;
  if (error) return <div className="rounded-[2rem] border border-amber-100 bg-amber-50/55 p-10 text-center"><p className="text-sm text-amber-800">知识空间暂时没有加载成功。</p><Button variant="outline" size="sm" onClick={onRetry} className="mt-3 gap-2 rounded-xl"><RefreshCw className="h-3.5 w-3.5" />重新加载</Button></div>;
  if (!graph || !scene || scene.nodes.length === 0) return <div className="rounded-[2rem] border border-dashed border-violet-200 bg-white/45 p-10 text-center text-sm text-[var(--em-muted-ink)]">当前课程没有可呈现的知识关系。</div>;

  return (
    <section data-knowledge-scene="combined" className="overflow-hidden rounded-[2.25rem] border border-violet-100/80 bg-white/50 shadow-[0_30px_80px_rgba(77,61,133,0.11)]">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-primary-700"><Sparkles className="h-4 w-4" />真实知识星图</p>
              <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">节点状态来自真实学习评价；连线只使用课程材料中的已有关系。</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] text-[var(--em-muted-ink)]">
              {Object.entries(RELATION_LABEL).map(([key, label]) => <span key={key}><strong className="text-primary-700">{key}</strong> · {label}</span>)}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-[1.75rem] border border-white/80 bg-[radial-gradient(circle_at_50%_18%,rgba(196,181,253,.24),transparent_35%),rgba(250,249,255,.72)]">
            <svg viewBox={`0 0 ${width} 540`} role="img" aria-label="融合课程关系与学习状态的知识星图" className="min-w-[820px]">
              {visibleEdges.map((edge) => {
                const source = positions.get(edge.source);
                const target = positions.get(edge.target);
                if (!source || !target) return null;
                return <g key={edge.id}><line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={edge.relation === 'precedes' ? '#f59e0b' : '#c4b5fd'} strokeWidth="2" strokeDasharray={edge.relation === 'precedes' ? '7 6' : undefined} opacity="0.74" /><text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 7} textAnchor="middle" fontSize="10" fill="#786a91">{RELATION_LABEL[edge.relation]}</text></g>;
              })}
              {visibleNodes.map((node) => {
                const position = positions.get(node.id);
                if (!position) return null;
                const isSelected = selected?.id === node.id;
                const radius = nodeRadius(node, isSelected);
                const tone = node.status ? NODE_COLOR[node.status] : { fill: node.kind === 'course' ? '#7662ce' : '#e9e5f6', stroke: '#c4b5fd' };
                const labelLimit = node.kind === 'section' ? 8 : 11;
                return <g key={node.id} role="button" tabIndex={0} aria-label={`${node.label}，${node.kind}`} onClick={() => setSelectedId(node.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(node.id); }} className="cursor-pointer">
                  {isSelected ? <circle cx={position.x} cy={position.y} r={radius + 11} fill="none" stroke="#a78bfa" strokeWidth="2" opacity="0.34" /> : null}
                  {node.inCurrentPlan && !isSelected ? <circle cx={position.x} cy={position.y} r={radius + 7} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="3 4" /> : null}
                  <circle cx={position.x} cy={position.y} r={radius} fill={tone.fill} stroke={tone.stroke} strokeWidth={isSelected ? 4 : 2} />
                  <text x={position.x} y={position.y + radius + 24} textAnchor="middle" fontSize={node.kind === 'section' ? '11' : '13'} fontWeight="700" fill="#44385c">{node.label.length > labelLimit ? `${node.label.slice(0, labelLimit)}…` : node.label}</text>
                </g>;
              })}
            </svg>
          </div>
          {attentionPoints.length > 0 ? <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-[var(--em-muted-ink)]"><span className="font-semibold text-primary-700">仍需关注</span>{attentionPoints.map((point) => <button key={point.knowledgePointId} type="button" onClick={() => setSelectedId(`point:${point.knowledgePointId}`)} className="underline decoration-violet-200 underline-offset-4 hover:text-primary-700">{point.knowledgePointName} · {DIAGNOSIS_STATUS_LABEL[point.status]}</button>)}</div> : null}
        </div>

        <aside className="border-t border-violet-100 bg-white/58 p-5 sm:p-6 xl:border-l xl:border-t-0" aria-label="知识点详情">
          {selected ? <>
            <p className="text-[10px] font-bold tracking-[0.16em] text-primary-600">SELECTED NODE</p>
            <h2 className="mt-2 text-xl font-bold">{selected.label}</h2>
            <p className="mt-1 text-xs text-[var(--em-muted-ink)]">{selected.kind === 'course' ? '课程根节点' : selected.kind === 'knowledge_point' ? '知识点节点' : '课程章节节点'}</p>
            {selected.diagnosis ? <div className="mt-6 border-l-2 border-primary-300 pl-4"><p className="text-sm font-semibold">{DIAGNOSIS_STATUS_LABEL[selected.diagnosis.status]}{selected.inCurrentPlan ? ' · 当前计划' : ''}</p><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">{getKnowledgeNodeStatusText(selected.diagnosis)}</p></div> : <p className="mt-6 text-xs leading-5 text-[var(--em-muted-ink)]">此节点用于表达课程结构，不单独推断掌握状态。</p>}
            <Button asChild className="mt-6 w-full gap-2 rounded-full bg-primary-600 hover:bg-primary-700"><Link to="/my-learning"><BookOpen className="h-4 w-4" />回到正式学习入口<ArrowRight className="h-4 w-4" /></Link></Button>
            <details className="mt-6 border-t border-violet-100 pt-4 text-xs">
              <summary className="cursor-pointer font-semibold text-primary-700">查看材料来源（{selected.sourceSections.length}）</summary>
              <ul className="mt-3 space-y-2 text-[var(--em-muted-ink)]">{selected.sourceSections.map((source) => <li key={source}>{source}</li>)}</ul>
            </details>
            <details className="mt-4 border-t border-violet-100 pt-4 text-xs">
              <summary className="cursor-pointer font-semibold text-primary-700">查看全图来源（{graph.sources.length}）</summary>
              <ul className="mt-3 space-y-2 text-[var(--em-muted-ink)]">{graph.sources.map((source) => <li key={source}>{source}</li>)}</ul>
            </details>
          </> : null}
        </aside>
      </div>
    </section>
  );
}
