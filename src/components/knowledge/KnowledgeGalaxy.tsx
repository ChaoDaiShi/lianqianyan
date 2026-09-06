import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Loader2,
  Maximize2,
  RefreshCw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { KnowledgePointDiagnosis, PersistedStudyPlan } from '@/domain';
import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import type { KnowledgeGraphData, KnowledgePointContent } from '@/lib/educationApi';
import { fetchKnowledgePoint } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';
import {
  buildKnowledgeScene,
  getKnowledgeNodeStatusText,
  type KnowledgeSceneNode,
} from './knowledgePresentation';
import { ForceSimulation, precomputeLayout } from './forceSimulation';
import {
  applyViewportAttribute,
  computeFitTransform,
  panBy,
  screenToGraph,
  zoomAt,
  type ScreenPoint,
  type ViewTransform,
} from './graphViewport';

interface KnowledgeGalaxyProps {
  graph: KnowledgeGraphData | null;
  points: KnowledgePointDiagnosis[];
  plan: PersistedStudyPlan | null;
  courseId: string;
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
  unassessed: { fill: '#8ca3cf', stroke: '#bccbe8' },
} as const;

const COURSE_COLOR = { fill: '#f59e0b', stroke: '#fde68a' };

/** 模拟世界尺寸：布局在此空间收敛，视口再适配/缩放到面板。 */
const WORLD = { width: 1400, height: 920 };
/** 连线自然长度：收紧节点间距。 */
const LINK_LENGTH = 112;
/** 静态首帧（SSR/测试）假设的面板尺寸，挂载后按真实尺寸重新适配。 */
const ASSUMED_VIEWPORT = { width: 960, height: 540 };

type GestureMode = 'none' | 'pan' | 'pinch' | 'node';

interface GestureState {
  mode: GestureMode;
  nodeId: string | null;
  moved: boolean;
  last: ScreenPoint;
  pinchDistance: number;
}

const IDLE_GESTURE: GestureState = { mode: 'none', nodeId: null, moved: false, last: { x: 0, y: 0 }, pinchDistance: 0 };

function nodeRadius(node: KnowledgeSceneNode): number {
  if (node.kind === 'course') return 38;
  if (node.inCurrentPlan) return 31;
  if (node.kind === 'knowledge_point') return 27;
  return 18;
}

type DetailState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; content: KnowledgePointContent }
  | { status: 'error' };

export function KnowledgeGalaxy({ graph, points, plan, courseId, primaryFocusId, loading, error, onRetry }: KnowledgeGalaxyProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 只有用户显式点击节点才进入聚焦态（压暗非邻域）；默认展示全图
  const [focusMode, setFocusMode] = useState(false);
  const scene = useMemo(
    () => graph ? buildKnowledgeScene({ graph, points, plan }) : null,
    [graph, plan, points],
  );

  const simulation = useMemo(() => {
    if (!scene || scene.nodes.length === 0) return null;
    const instance = new ForceSimulation(
      scene.nodes.map((node) => ({ id: node.id, radius: nodeRadius(node) })),
      scene.edges.map((edge) => ({ source: edge.source, target: edge.target })),
      { ...WORLD, linkLength: LINK_LENGTH },
    );
    precomputeLayout(instance);
    return instance;
  }, [scene]);

  const edgeEndpoints = useMemo(() => {
    const map = new Map<string, [string, string]>();
    scene?.edges.forEach((edge) => map.set(edge.id, [edge.source, edge.target]));
    return map;
  }, [scene]);

  const staticNodes = useMemo(() => {
    if (!simulation || !scene) return [];
    return scene.nodes.flatMap((node) => {
      const position = simulation.positionOf(node.id);
      return position ? [{ node, position }] : [];
    });
  }, [simulation, scene]);

  const initialTransform = useMemo(() => computeFitTransform(
    staticNodes.map(({ node, position }) => ({ x: position.x, y: position.y, radius: nodeRadius(node) })),
    ASSUMED_VIEWPORT,
  ), [staticNodes]);

  const selected = scene?.nodes.find((node) => node.id === selectedId)
    ?? scene?.nodes.find((node) => node.knowledgePointId === primaryFocusId)
    ?? scene?.nodes.find((node) => node.kind === 'knowledge_point')
    ?? scene?.nodes[0]
    ?? null;
  const neighborIds = useMemo(() => {
    if (!selected || !scene) return null;
    const ids = new Set<string>([selected.id]);
    scene.edges.forEach((edge) => {
      if (edge.source === selected.id) ids.add(edge.target);
      if (edge.target === selected.id) ids.add(edge.source);
    });
    return ids;
  }, [scene, selected?.id]);
  const attentionPoints = points.filter((point) => point.status === 'weak' || point.status === 'unassessed' || point.status === 'insufficient_evidence');

  // —— 视口与模拟的命令式渲染：指针/物理逐帧更新属性，不触发 React 重渲染 ——
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<SVGGElement | null>(null);
  const transformRef = useRef<ViewTransform>(initialTransform);
  const nodeRefs = useRef(new Map<string, SVGGElement>());
  const edgeRefs = useRef(new Map<string, SVGLineElement>());
  const pointersRef = useRef(new Map<number, ScreenPoint>());
  const gestureRef = useRef<GestureState>({ ...IDLE_GESTURE });
  const dragGuardRef = useRef(0);
  const dragOffsetRef = useRef<ScreenPoint>({ x: 0, y: 0 });
  const ensureLoopRef = useRef<() => void>(() => {});
  const detailCacheRef = useRef(new Map<string, KnowledgePointContent>());

  const applyTransform = useCallback(() => {
    applyViewportAttribute(viewportRef.current, transformRef.current);
  }, []);

  const paint = useCallback(() => {
    if (!simulation) return;
    nodeRefs.current.forEach((element, id) => {
      const position = simulation.positionOf(id);
      if (position) element.setAttribute('transform', `translate(${position.x} ${position.y})`);
    });
    edgeRefs.current.forEach((element, id) => {
      const endpoints = edgeEndpoints.get(id);
      if (!endpoints) return;
      const source = simulation.positionOf(endpoints[0]);
      const target = simulation.positionOf(endpoints[1]);
      if (!source || !target) return;
      element.setAttribute('x1', `${source.x}`);
      element.setAttribute('y1', `${source.y}`);
      element.setAttribute('x2', `${target.x}`);
      element.setAttribute('y2', `${target.y}`);
    });
  }, [edgeEndpoints, simulation]);

  const fitView = useCallback(() => {
    if (!simulation || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const entries = staticNodes.flatMap(({ node }) => {
      const position = simulation.positionOf(node.id);
      return position ? [{ x: position.x, y: position.y, radius: nodeRadius(node) }] : [];
    });
    transformRef.current = computeFitTransform(entries, { width: rect.width, height: rect.height });
    applyTransform();
  }, [applyTransform, simulation, staticNodes]);

  const zoomBy = useCallback((factor: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    transformRef.current = zoomAt(transformRef.current, { x: rect.width / 2, y: rect.height / 2 }, factor);
    applyTransform();
  }, [applyTransform]);

  const centerOnNode = useCallback((id: string) => {
    if (!simulation || !svgRef.current) return;
    const position = simulation.positionOf(id);
    if (!position) return;
    const rect = svgRef.current.getBoundingClientRect();
    const k = transformRef.current.k;
    transformRef.current = { k, x: rect.width / 2 - k * position.x, y: rect.height / 2 - k * position.y };
    applyTransform();
  }, [applyTransform, simulation]);

  useEffect(() => {
    // 每次渲染提交后把物理状态同步到 DOM（React 重渲染会用 JSX 初值覆盖属性）
    applyTransform();
    paint();
  });

  useEffect(() => {
    if (!simulation) return;
    fitView();
    let raf: number | null = null;
    const tick = () => {
      raf = null;
      const interacting = gestureRef.current.mode !== 'none';
      if (simulation.isActive() || interacting) {
        simulation.step();
        paint();
        raf = requestAnimationFrame(tick);
      }
    };
    ensureLoopRef.current = () => {
      if (raf === null) raf = requestAnimationFrame(tick);
    };
    ensureLoopRef.current();
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      ensureLoopRef.current = () => {};
    };
  }, [fitView, paint, simulation]);

  useEffect(() => {
    // React 的合成 onWheel 是 passive 的，缩放需要原生非 passive 监听；
    // svg 在 loading 态还不存在，依赖 simulation 变化后重新挂载监听
    const svg = svgRef.current;
    if (!svg || !simulation) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0016);
      transformRef.current = zoomAt(transformRef.current, { x: event.clientX - rect.left, y: event.clientY - rect.top }, factor);
      applyTransform();
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [applyTransform, simulation]);

  const localPoint = useCallback((event: { clientX: number; clientY: number }): ScreenPoint => {
    const rect = svgRef.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  }, []);

  const pinchDistance = useCallback((): number => {
    const values = [...pointersRef.current.values()];
    if (values.length < 2) return 0;
    return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }, []);

  const onCanvasPointerDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const point = localPoint(event);
    svgRef.current?.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, point);
    if (pointersRef.current.size >= 2) {
      gestureRef.current = { ...IDLE_GESTURE, mode: 'pinch', pinchDistance: pinchDistance() };
    } else {
      gestureRef.current = { ...IDLE_GESTURE, mode: 'pan', last: point };
    }
    ensureLoopRef.current();
  }, [localPoint, pinchDistance, simulation]);

  const onCanvasPointerMove = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const point = localPoint(event);
    pointersRef.current.set(event.pointerId, point);
    const gesture = gestureRef.current;

    if (gesture.mode === 'pinch') {
      const distance = pinchDistance();
      const pointers = [...pointersRef.current.values()];
      if (gesture.pinchDistance > 0 && distance > 0 && pointers.length >= 2) {
        const midpoint = {
          x: (pointers[0].x + pointers[1].x) / 2,
          y: (pointers[0].y + pointers[1].y) / 2,
        };
        transformRef.current = zoomAt(transformRef.current, midpoint, distance / gesture.pinchDistance);
        applyTransform();
      }
      gesture.pinchDistance = distance;
      return;
    }
    if (gesture.mode === 'pan') {
      const dx = point.x - gesture.last.x;
      const dy = point.y - gesture.last.y;
      if (Math.hypot(dx, dy) > 3) gesture.moved = true;
      transformRef.current = panBy(transformRef.current, dx, dy);
      gesture.last = point;
      applyTransform();
      return;
    }
    if (gesture.mode === 'node' && gesture.nodeId && simulation) {
      if (Math.hypot(point.x - gesture.last.x, point.y - gesture.last.y) > 3) gesture.moved = true;
      const graphPoint = screenToGraph(transformRef.current, point);
      simulation.movePinned(gesture.nodeId, graphPoint.x + dragOffsetRef.current.x, graphPoint.y + dragOffsetRef.current.y);
      gesture.last = point;
      ensureLoopRef.current();
    }
  }, [applyTransform, localPoint, pinchDistance, simulation]);

  const endGesture = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    const gesture = gestureRef.current;
    // 拖拽结束后节点保持钉住：留在用户摆放的位置，双击节点可还原
    if (gesture.moved) dragGuardRef.current = Date.now();
    if (pointersRef.current.size === 0) {
      gestureRef.current = { ...IDLE_GESTURE };
    } else if (pointersRef.current.size === 1) {
      gestureRef.current = { ...IDLE_GESTURE, mode: 'pan', moved: true, last: [...pointersRef.current.values()][0] };
    }
  }, [simulation]);

  const selectNode = useCallback((id: string | null) => {
    setSelectedId(id);
    setFocusMode(id !== null);
  }, []);

  const onNodePointerDown = useCallback((node: KnowledgeSceneNode) => (event: ReactPointerEvent<SVGGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.stopPropagation();
    (event.currentTarget as SVGGElement).setPointerCapture?.(event.pointerId);
    const point = localPoint(event);
    pointersRef.current.set(event.pointerId, point);
    gestureRef.current = { ...IDLE_GESTURE, mode: 'node', nodeId: node.id, last: point };
    if (simulation) {
      const nodePosition = simulation.positionOf(node.id);
      const cursorGraph = screenToGraph(transformRef.current, point);
      // 记录抓取偏移，节点跟随光标而非跳到光标处
      dragOffsetRef.current = nodePosition
        ? { x: nodePosition.x - cursorGraph.x, y: nodePosition.y - cursorGraph.y }
        : { x: 0, y: 0 };
      simulation.pin(node.id);
    }
    ensureLoopRef.current();
  }, [ensureLoopRef, localPoint, simulation]);

  // —— 节点知识详情：点击知识点/章节节点后加载真实课程内容 ——
  const detailKey = selected && selected.kind !== 'course' ? selected.knowledgePointId : null;
  const [detail, setDetail] = useState<DetailState>({ status: 'idle' });
  useEffect(() => {
    if (!detailKey) {
      setDetail({ status: 'idle' });
      return;
    }
    const cached = detailCacheRef.current.get(detailKey);
    if (cached) {
      setDetail({ status: 'ready', content: cached });
      return;
    }
    let cancelled = false;
    setDetail({ status: 'loading' });
    fetchKnowledgePoint(detailKey, courseId)
      .then((content) => {
        detailCacheRef.current.set(detailKey, content);
        if (!cancelled) setDetail({ status: 'ready', content });
      })
      .catch(() => {
        if (!cancelled) setDetail({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, detailKey]);

  if (loading) return <div className="rounded-[2rem] border border-violet-100 bg-white/55 p-10 text-sm text-[var(--em-muted-ink)]"><p className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />正在读取课程关系与学习状态…</p></div>;
  if (error) return <div className="rounded-[2rem] border border-amber-100 bg-amber-50/55 p-10 text-center"><p className="text-sm text-amber-800">知识空间暂时没有加载成功。</p><Button variant="outline" size="sm" onClick={onRetry} className="mt-3 gap-2 rounded-xl"><RefreshCw className="h-3.5 w-3.5" />重新加载</Button></div>;
  if (!graph || !scene || !simulation || scene.nodes.length === 0) return <div className="rounded-[2rem] border border-dashed border-violet-200 bg-white/45 p-10 text-center text-sm text-[var(--em-muted-ink)]">当前课程没有可呈现的知识关系。</div>;

  const stars = buildStarField(graph.courseId);

  return (
    <section data-knowledge-scene="combined" className="overflow-hidden rounded-[2.25rem] border border-violet-100/80 bg-white/50 shadow-[0_30px_80px_rgba(77,61,133,0.11)]">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-primary-700"><Sparkles className="h-4 w-4" />课程型 GraphRAG 知识星图</p>
              <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">全部 {scene.nodes.length} 节点 / {scene.edges.length} 关系 · 拖拽空白平移 · 滚轮缩放 · 拖动节点摆放（双击还原） · 点击节点查看知识详情</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button type="button" variant="outline" size="icon" aria-label="缩小" className="h-8 w-8 rounded-xl" onClick={() => zoomBy(1 / 1.3)}><ZoomOut className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" aria-label="放大" className="h-8 w-8 rounded-xl" onClick={() => zoomBy(1.3)}><ZoomIn className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" aria-label="适配全图" className="h-8 w-8 rounded-xl" onClick={fitView}><Maximize2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 text-[10px] text-[var(--em-muted-ink)]">
            {Object.entries(RELATION_LABEL).map(([key, label]) => <span key={key}><strong className="text-primary-700">{key}</strong> · {label}</span>)}
            <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full" style={{ background: 'linear-gradient(90deg,#f59e0b,#38bdf8,#10b981,#e879f9)' }} />节点颜色 = 掌握状态</span>
          </div>
          <div className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-white/10 shadow-[inset_0_0_80px_rgba(2,6,23,0.55)]">
            <svg
              ref={svgRef}
              role="img"
              aria-label="可自由拖拽缩放的课程知识星图"
              className="block h-[520px] w-full touch-none select-none sm:h-[600px]"
              style={{ background: 'linear-gradient(142deg, #2b2866 0%, #0b1024 100%)' }}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              onClick={() => {
                if (Date.now() - dragGuardRef.current < 250) return;
                selectNode(null);
              }}
            >
              <g ref={viewportRef} transform={`translate(${initialTransform.x} ${initialTransform.y}) scale(${initialTransform.k})`}>
                {stars.map((star) => <circle key={`star-${star.key}`} cx={star.x} cy={star.y} r={star.r} fill="#c7d2fe" opacity={star.opacity} />)}
                {scene.edges.map((edge) => {
                  const source = simulation.positionOf(edge.source);
                  const target = simulation.positionOf(edge.target);
                  if (!source || !target) return null;
                  const touchesSelection = !!selected && (edge.source === selected.id || edge.target === selected.id);
                  const focusActive = focusMode && !!selected;
                  const dimmed = focusActive && !touchesSelection;
                  return (
                    <line
                      key={edge.id}
                      ref={(element) => { if (element) edgeRefs.current.set(edge.id, element); else edgeRefs.current.delete(edge.id); }}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={edge.relation === 'precedes' ? '#fbbf24' : focusActive && touchesSelection ? '#a78bfa' : '#8ea2ff'}
                      strokeWidth={focusActive && touchesSelection ? 2.4 : 1.4}
                      strokeDasharray={edge.relation === 'precedes' ? '7 6' : undefined}
                      opacity={dimmed ? 0.12 : focusActive && touchesSelection ? 0.9 : 0.34}
                    />
                  );
                })}
                {staticNodes.map(({ node, position }) => {
                  const isSelected = selected?.id === node.id;
                  const dimmed = focusMode && !!neighborIds && !neighborIds.has(node.id);
                  const tone = node.kind === 'course' ? COURSE_COLOR : node.status ? NODE_COLOR[node.status] : { fill: '#7662ce', stroke: '#c4b5fd' };
                  const radius = nodeRadius(node);
                  const labelInside = node.kind === 'course';
                  return (
                    <g
                      key={node.id}
                      ref={(element) => { if (element) nodeRefs.current.set(node.id, element); else nodeRefs.current.delete(node.id); }}
                      transform={`translate(${position.x} ${position.y})`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${node.label}，${node.kind === 'course' ? '课程根节点' : node.kind === 'knowledge_point' ? '知识点' : '章节'}，回车查看详情`}
                      className="cursor-grab outline-none active:cursor-grabbing"
                      style={{ opacity: dimmed ? 0.22 : 1, transition: 'opacity 240ms ease' }}
                      onPointerDown={onNodePointerDown(node)}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        simulation?.unpin(node.id);
                        simulation?.reheat();
                        ensureLoopRef.current();
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (Date.now() - dragGuardRef.current < 250) return;
                        selectNode(node.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          selectNode(node.id);
                        }
                      }}
                    >
                      {isSelected ? <circle r={radius + 11} fill="none" stroke={tone.stroke} strokeWidth={2} opacity={0.6} /> : null}
                      {node.inCurrentPlan && !isSelected ? <circle r={radius + 7} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="3 4" opacity={0.75} /> : null}
                      <circle r={radius + 6} fill={tone.fill} opacity={0.18} />
                      <circle r={radius} fill={tone.fill} stroke={tone.stroke} strokeWidth={isSelected ? 3 : 1.6} />
                      {labelInside
                        ? <text y={5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1f2937" style={{ pointerEvents: 'none' }}>{node.label.length > 6 ? `${node.label.slice(0, 6)}…` : node.label}</text>
                        : <text y={radius + 19} textAnchor="middle" fontSize={node.kind === 'knowledge_point' ? 13 : 12} fontWeight={node.kind === 'knowledge_point' ? 700 : 500} fill="#dbe3ff" style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: 'rgba(7,10,24,0.85)', strokeWidth: 3 }}>{node.label.length > 8 ? `${node.label.slice(0, 8)}…` : node.label}</text>}
                    </g>
                  );
                })}
              </g>
            </svg>
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[#0d1126]/80 px-3 py-1 text-[10px] text-slate-300">
              按住空白处拖动平移 · 滚轮或双指缩放 · 拖动节点摆放 · 双击节点还原
            </div>
          </div>
          {attentionPoints.length > 0 ? <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-[var(--em-muted-ink)]"><span className="font-semibold text-primary-700">仍需关注</span>{attentionPoints.map((point) => <button key={point.knowledgePointId} type="button" onClick={() => { selectNode(`point:${point.knowledgePointId}`); centerOnNode(`point:${point.knowledgePointId}`); }} className="underline decoration-violet-200 underline-offset-4 hover:text-primary-700">{point.knowledgePointName}</button>)}</div> : null}
        </div>

        <aside className="border-t border-violet-100 bg-white/58 p-5 sm:p-6 xl:border-l xl:border-t-0" aria-label="节点知识详情">
          {selected ? <>
            <p className="text-[10px] font-bold tracking-[0.16em] text-primary-600">NODE DETAIL</p>
            <h2 className="mt-2 text-xl font-bold">{selected.label}</h2>
            <p className="mt-1 text-xs text-[var(--em-muted-ink)]">{selected.kind === 'course' ? '课程根节点' : selected.kind === 'knowledge_point' ? '知识点' : '课程章节'} · 关系只来自课程材料，不由界面虚构</p>

            {detailKey ? (
              <div className="mt-5">
                <p className="text-xs font-bold text-primary-700">知识点内容</p>
                {detail.status === 'loading' || detail.status === 'idle' ? (
                  <div className="mt-2 space-y-2" aria-label="正在加载知识点内容">
                    {[0, 1, 2].map((line) => <div key={line} className="h-3 animate-pulse rounded bg-violet-100" style={{ width: `${92 - line * 18}%` }} />)}
                  </div>
                ) : detail.status === 'error' ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-amber-700"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />知识点详情暂时无法加载，请稍后重试。</p>
                ) : (
                  <>
                    <ol className="mt-2 flex flex-wrap gap-1.5">
                      {detail.content.sections.map((section, index) => <li key={`${section.title}-${index}`} className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-primary-700">{index + 1}. {section.title}</li>)}
                    </ol>
                    <div className="mt-3 space-y-2">
                      {detail.content.sections.map((section, index) => (
                        <details key={`${section.title}-${index}`} open={detail.content.sections.length === 1 || section.title === selected.label || index === 0} className="group rounded-2xl border border-violet-100 bg-white/70 px-3 py-2 text-xs">
                          <summary className="cursor-pointer list-none font-semibold text-[var(--em-ink)]"><span className="mr-1 text-primary-600 group-open:hidden">▸</span><span className="mr-1 hidden text-primary-600 group-open:inline">▾</span>{section.title}</summary>
                          <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap leading-6 text-[var(--em-muted-ink)]">{section.content || '该章节暂无正文摘录。'}</p>
                        </details>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-violet-100 bg-white/70 p-3 text-xs leading-5 text-[var(--em-muted-ink)]">
                <p>课程全景：{scene.nodes.filter((node) => node.kind === 'knowledge_point').length} 个知识点 · {scene.nodes.filter((node) => node.kind === 'section').length} 个章节 · {scene.edges.length} 条关系。</p>
                <p className="mt-1">点击任意知识点或章节节点，查看来自课程材料的详细内容。</p>
              </div>
            )}

            {selected.diagnosis ? <div className="mt-5 border-l-2 border-primary-300 pl-4"><p className="text-sm font-semibold">{DIAGNOSIS_STATUS_LABEL[selected.diagnosis.status]}{selected.inCurrentPlan ? ' · 当前计划' : ''}</p><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">{getKnowledgeNodeStatusText(selected.diagnosis)}</p></div> : <p className="mt-5 text-xs leading-5 text-[var(--em-muted-ink)]">此节点用于表达课程结构，不单独推断掌握状态。</p>}
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

/** 用课程 ID 作种子的确定性星空背景（纯装饰，随视口一起平移缩放）。 */
function buildStarField(seedText: string, count = 44): Array<{ key: number; x: number; y: number; r: number; opacity: number }> {
  let hash = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, (_, key) => ({
    key,
    x: next() * WORLD.width,
    y: next() * WORLD.height,
    r: 0.6 + next() * 1.3,
    opacity: 0.12 + next() * 0.38,
  }));
}
