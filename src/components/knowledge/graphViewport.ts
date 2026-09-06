/**
 * 知识图谱视口数学：平移 / 缩放 / 适配视图的纯函数，
 * 供 KnowledgeGalaxy 的指针与滚轮交互复用和单元测试。
 */

export interface ViewTransform {
  /** 屏幕平移量（px）。 */
  x: number;
  y: number;
  /** 缩放倍率。 */
  k: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 2.8;

export function clampScale(k: number, min = ZOOM_MIN, max = ZOOM_MAX): number {
  if (!Number.isFinite(k)) return 1;
  return Math.min(Math.max(k, min), max);
}

/** 以 screenPoint 为锚点缩放：锚点下的图谱坐标在缩放前后保持不动。 */
export function zoomAt(transform: ViewTransform, screenPoint: ScreenPoint, factor: number): ViewTransform {
  const k = clampScale(transform.k * (Number.isFinite(factor) && factor > 0 ? factor : 1));
  const ratio = k / transform.k;
  return {
    k,
    x: screenPoint.x - (screenPoint.x - transform.x) * ratio,
    y: screenPoint.y - (screenPoint.y - transform.y) * ratio,
  };
}

export function panBy(transform: ViewTransform, dx: number, dy: number): ViewTransform {
  return { k: transform.k, x: transform.x + (Number.isFinite(dx) ? dx : 0), y: transform.y + (Number.isFinite(dy) ? dy : 0) };
}

export function screenToGraph(transform: ViewTransform, point: ScreenPoint): ScreenPoint {
  return { x: (point.x - transform.x) / transform.k, y: (point.y - transform.y) / transform.k };
}

export function graphToScreen(transform: ViewTransform, point: ScreenPoint): ScreenPoint {
  return { x: point.x * transform.k + transform.x, y: point.y * transform.k + transform.y };
}

/** 把变换写入 SVG 元素的 transform 属性（配合命令式逐帧更新，避免 React 重渲染）。 */
export function applyViewportAttribute(
  element: { setAttribute(name: string, value: string): void } | null,
  transform: ViewTransform,
): void {
  if (!element) return;
  element.setAttribute('transform', `translate(${transform.x} ${transform.y}) scale(${transform.k})`);
}

/**
 * 计算把全部节点放进视口的变换（含节点半径与标签余量）。
 * minScale 下限防止大图被缩得过小而无法阅读标签——超出部分交给平移探索。
 * 图谱为空或视口尺寸非法时返回恒等变换。
 */
export function computeFitTransform(
  positions: Array<{ x: number; y: number; radius: number }>,
  viewport: { width: number; height: number },
  padding = 64,
  minScale = 0.6,
): ViewTransform {
  if (
    positions.length === 0
    || !Number.isFinite(viewport.width) || viewport.width <= 0
    || !Number.isFinite(viewport.height) || viewport.height <= 0
  ) {
    return { x: 0, y: 0, k: 1 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const position of positions) {
    const radius = Number.isFinite(position.radius) ? position.radius : 0;
    minX = Math.min(minX, position.x - radius);
    minY = Math.min(minY, position.y - radius);
    maxX = Math.max(maxX, position.x + radius);
    maxY = Math.max(maxY, position.y + radius);
  }
  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const availableWidth = Math.max(viewport.width - padding * 2, 1);
  const availableHeight = Math.max(viewport.height - padding * 2, 1);
  const k = clampScale(Math.min(availableWidth / contentWidth, availableHeight / contentHeight), minScale, 1.8);
  return {
    k,
    x: viewport.width / 2 - k * (minX + contentWidth / 2),
    y: viewport.height / 2 - k * (minY + contentHeight / 2),
  };
}
