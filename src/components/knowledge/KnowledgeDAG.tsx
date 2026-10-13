import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import type { KnowledgePointDiagnosis } from '@/domain';
import type { KnowledgeGraphData, KnowledgePointContent } from '@/lib/educationApi';
import type { LeapTopic } from '@/lib/adaptiveApi';
import { fetchKnowledgePoint } from '@/lib/educationApi';
import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import { Button } from '@/components/ui/button';
import { MarkdownText } from '@/components/content/MarkdownText';
import { cn } from '@/lib/utils';
import { buildCurriculumMatrix } from '@/components/diagnosis/curriculumMatrix';
import { buildPrerequisiteDag } from './prerequisiteDag';
import { MaterialProvenance } from './MaterialProvenance';

const RELATION_LABEL = {
  contains: '包含',
  explains: '解释',
  precedes: '先修依赖',
} as const;

interface KnowledgeDAGProps {
  graph: KnowledgeGraphData | null;
  points: KnowledgePointDiagnosis[];
  topics: Pick<LeapTopic, 'knowledgePointId' | 'prerequisites'>[];
  courseId: string;
  primaryFocusId?: string | null;
}

function KnowledgeMaterial({
  knowledgePointId,
  courseId,
}: {
  knowledgePointId: string | null;
  courseId: string;
}) {
  const [content, setContent] = useState<KnowledgePointContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!knowledgePointId) {
      setContent(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchKnowledgePoint(knowledgePointId, courseId)
      .then((next) => { if (!cancelled) setContent(next); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [courseId, knowledgePointId]);

  if (!knowledgePointId) {
    return <p className="mt-3 text-sm text-[var(--em-muted-ink)]">该前置知识点不在当前课程知识清单中，暂无本课程教材正文。</p>;
  }
  if (loading) return <p className="mt-3 text-sm text-[var(--em-muted-ink)]">正在读取课程教材…</p>;
  if (error) return <p className="mt-3 text-sm text-amber-800">该知识点的课程正文暂时无法读取。</p>;
  if (!content) return <p className="mt-3 text-sm text-[var(--em-muted-ink)]">当前课程没有返回该知识点的正文。</p>;

  return (
    <div className="mt-3 space-y-5">
      <MaterialProvenance material={content} />
      {content.sections.map((section, index) => (
        <section key={`${section.title}-${index}`}>
          <h4 className="mb-2 text-sm font-semibold">{section.title}</h4>
          <MarkdownText content={section.content} />
        </section>
      ))}
    </div>
  );
}

export function KnowledgeDAG({
  graph,
  points,
  topics,
  courseId,
  primaryFocusId,
}: KnowledgeDAGProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedElement = useRef<HTMLButtonElement | null>(null);
  const markerId = `dag-arrow-${useId().replace(/:/g, '')}`;
  const dag = useMemo(() => buildPrerequisiteDag(points, topics, graph), [points, topics, graph]);
  const selected = dag.nodes.find((node) => node.id === selectedId)
    ?? dag.nodes.find((node) => node.id === primaryFocusId)
    ?? dag.nodes.find((node) => !node.external)
    ?? dag.nodes[0]
    ?? null;
  const outline = useMemo(
    () => buildCurriculumMatrix(points, graph),
    [graph, points],
  );
  const graphNode = selected?.external
    ? null
    : graph?.nodes.find((node) => node.knowledgePointId === selected?.id && node.kind === 'knowledge_point') ?? null;
  const graphNodeById = new Map((graph?.nodes ?? []).map((node) => [node.id, node]));
  const graphRelations = graphNode
    ? (graph?.edges ?? []).filter(
      (edge) => edge.source === graphNode.id || edge.target === graphNode.id,
    )
    : [];
  const maxColumn = Math.max(0, ...dag.nodes.map((node) => node.column));
  const rowsByColumn = new Map<number, number>();
  dag.nodes.forEach((node) => rowsByColumn.set(node.column, (rowsByColumn.get(node.column) ?? 0) + 1));
  const maxRows = Math.max(1, ...rowsByColumn.values());
  const columnWidth = 264;
  const rowHeight = 112;
  const cardWidth = 224;
  const cardHeight = 86;
  const canvasWidth = (maxColumn + 1) * columnWidth + 32;
  const canvasHeight = maxRows * rowHeight + 24;
  const selectedPosition = selected && selected.column > 0;

  useEffect(() => {
    selectedElement.current?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [selected?.id]);

  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4" aria-label="课程知识目录">
        <h2 className="text-sm font-semibold">课程知识目录</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">目录来自当前课程 GraphRAG 节点与材料小节。</p>
        <ol className="mt-3 space-y-2">
          {outline.map((item) => {
            const point = points.find((value) => value.knowledgePointId === item.knowledgePointId);
            return (
              <li key={item.knowledgePointId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.knowledgePointId)}
                  aria-current={selected?.id === item.knowledgePointId ? 'location' : undefined}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2.5 text-left',
                    selected?.id === item.knowledgePointId
                      ? 'border-[var(--em-primary)] bg-[var(--em-primary-subtle)]'
                      : 'border-[var(--em-border)] hover:border-[var(--em-border-strong)]',
                  )}
                >
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="mt-1 block text-xs text-[var(--em-muted-ink)]">
                    {point ? DIAGNOSIS_STATUS_LABEL[point.status] : '诊断状态未知'}
                  </span>
                </button>
                {selected?.id === item.knowledgePointId && item.sections.length > 0 && (
                  <ul className="ml-3 mt-1 border-l border-[var(--em-border)] pl-3">
                    {item.sections.map((section) => (
                      <li key={section} className="py-1 text-xs text-[var(--em-muted-ink)]">{section}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
        {outline.length === 0 && (
          <p className="mt-3 text-sm leading-6 text-[var(--em-muted-ink)]">当前课程图谱没有返回知识点目录。</p>
        )}
      </aside>

      <div className="min-w-0 space-y-4">
        <section aria-label="先修关系概念图" className="overflow-hidden rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--em-border)] p-4">
            <div>
              <h2 className="text-lg font-semibold">课程概念依赖</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--em-muted-ink)]">
                先修箭头来自课程材料显式声明的依赖；未知状态不设锁。
              </p>
            </div>
            <span className="rounded-md bg-[var(--em-surface-subtle)] px-2.5 py-1.5 text-xs text-[var(--em-ink)]">
              {dag.edges.length} 条先修关系
            </span>
          </div>

          <div className="overflow-auto p-4">
            {dag.nodes.length > 0 ? (
              <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
                <svg
                  className="absolute inset-0"
                  width={canvasWidth}
                  height={canvasHeight}
                  aria-hidden="true"
                >
                  <defs>
                    <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                      <path d="M0,0 L8,4 L0,8 z" fill="#64748b" />
                    </marker>
                  </defs>
                  {dag.edges.map((edge) => {
                    const source = dag.nodes.find((node) => node.id === edge.source)!;
                    const target = dag.nodes.find((node) => node.id === edge.target)!;
                    return (
                      <line
                        key={`${edge.source}->${edge.target}`}
                        x1={source.column * columnWidth + 20 + cardWidth}
                        y1={source.row * rowHeight + 24 + cardHeight / 2}
                        x2={target.column * columnWidth + 20}
                        y2={target.row * rowHeight + 24 + cardHeight / 2}
                        stroke="#64748b"
                        strokeWidth="1.5"
                        markerEnd={`url(#${markerId})`}
                      />
                    );
                  })}
                </svg>
                {dag.nodes.map((node) => {
                  const point = points.find((item) => item.knowledgePointId === node.id);
                  const selectedStatus = point ? DIAGNOSIS_STATUS_LABEL[point.status] : '未知状态；不作锁定判断';
                  const mastered = point?.status === 'mastered' || point?.status === 'proficient';
                  const weak = point?.status === 'weak';
                  return (
                    <button
                      key={node.id}
                      ref={selected?.id === node.id ? selectedElement : null}
                      type="button"
                      onClick={() => setSelectedId(node.id)}
                      aria-pressed={selected?.id === node.id}
                      aria-label={`${node.label}，${selectedStatus}`}
                      className={cn(
                        'absolute flex min-h-[86px] w-56 flex-col justify-center rounded-lg border bg-[var(--em-surface)] px-3 py-2 text-left shadow-sm',
                        selected?.id === node.id ? 'border-[var(--em-primary)] ring-2 ring-[var(--em-focus-ring)]' : 'border-[var(--em-border)]',
                        mastered && 'border-l-4 border-l-green-700',
                        weak && 'border-l-4 border-l-amber-600',
                      )}
                      style={{ left: node.column * columnWidth + 20, top: node.row * rowHeight + 24 }}
                    >
                      <span className="text-sm font-semibold text-[var(--em-ink)]">{node.label}</span>
                      <span className="mt-1 text-xs text-[var(--em-muted-ink)]">{selectedStatus}</span>
                      {node.external && <span className="mt-1 text-xs text-[var(--em-muted-ink)]">课程图谱外 · 前置节点</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--em-border)] p-5 text-sm text-[var(--em-muted-ink)]">
                当前课程图谱尚无可展示的概念节点。
              </div>
            )}
            {dag.edges.length === 0 && dag.nodes.length > 0 && (
              <p className="mt-4 text-sm text-[var(--em-muted-ink)]">当前目录没有返回显式先修关系，节点状态不会据此锁定。</p>
            )}
            {selectedPosition && <span className="sr-only">已定位到选中的知识点。</span>}
          </div>
        </section>

        {selected && (
          <aside className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5" aria-label="知识点详情">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-[var(--em-primary)]"><BookOpen className="h-4 w-4" />知识点速查</p>
                <h2 className="mt-1 text-lg font-semibold">{selected.label}</h2>
                <p className="mt-1 text-sm text-[var(--em-muted-ink)]">
                  {selected.status ? DIAGNOSIS_STATUS_LABEL[selected.status] : '诊断状态未知；不作锁定判断'}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => selectedElement.current?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })}
                className="gap-2"
              >
                <ArrowRight className="h-3.5 w-3.5" />定位图中节点
              </Button>
            </div>

            <KnowledgeMaterial knowledgePointId={selected.external ? null : selected.id} courseId={courseId} />

            <details className="group mt-5 border-t border-[var(--em-border)] pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
                <span>GraphRAG 材料关系</span>
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              {graphRelations.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {graphRelations.map((edge) => {
                    const source = graphNodeById.get(edge.source)?.label ?? edge.source;
                    const target = graphNodeById.get(edge.target)?.label ?? edge.target;
                    return (
                      <li key={edge.id} className="rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-3 text-sm">
                        <p className="font-medium">{source} —{RELATION_LABEL[edge.relation]}→ {target}</p>
                        {edge.sourceSections.length > 0 && (
                          <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">材料：{edge.sourceSections.join('、')}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[var(--em-muted-ink)]">当前材料没有返回与该知识点相连的 GraphRAG 关系。</p>
              )}
            </details>

            {graph && graph.sources.length > 0 && (
              <details className="group mt-3 border-t border-[var(--em-border)] pt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
                  <span>课程材料来源 · {graph.sources.length}</span>
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </summary>
                <ul className="mt-3 space-y-1 text-sm text-[var(--em-ink)]">
                  {graph.sources.map((source) => <li key={source}>{source}</li>)}
                </ul>
              </details>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
