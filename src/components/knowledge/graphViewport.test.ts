import { describe, expect, it } from 'vitest';
import {
  computeFitTransform,
  graphToScreen,
  panBy,
  screenToGraph,
  zoomAt,
  ZOOM_MAX,
  ZOOM_MIN,
  type ViewTransform,
} from './graphViewport';

const IDENTITY: ViewTransform = { x: 0, y: 0, k: 1 };

describe('graphViewport', () => {
  it('keeps the graph point under the cursor fixed while zooming', () => {
    const cursor = { x: 420, y: 260 };
    const transform: ViewTransform = { x: 60, y: -30, k: 1.2 };
    const before = screenToGraph(transform, cursor);
    const zoomed = zoomAt(transform, cursor, 1.4);
    const after = screenToGraph(zoomed, cursor);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    expect(zoomed.k).toBeCloseTo(1.2 * 1.4, 6);
  });

  it('clamps zoom into the allowed range and tolerates bad factors', () => {
    expect(zoomAt(IDENTITY, { x: 0, y: 0 }, 9999).k).toBe(ZOOM_MAX);
    expect(zoomAt(IDENTITY, { x: 0, y: 0 }, 0.0001).k).toBe(ZOOM_MIN);
    expect(zoomAt(IDENTITY, { x: 0, y: 0 }, Number.NaN).k).toBe(1);
  });

  it('pans by the given delta', () => {
    expect(panBy(IDENTITY, 30, -18)).toEqual({ x: 30, y: -18, k: 1 });
    expect(panBy(IDENTITY, Number.NaN, 5)).toEqual({ x: 0, y: 5, k: 1 });
  });

  it('fits all nodes into the viewport with padding', () => {
    const positions = [
      { x: 100, y: 100, radius: 20 },
      { x: 700, y: 420, radius: 30 },
      { x: 400, y: 260, radius: 16 },
    ];
    const fit = computeFitTransform(positions, { width: 800, height: 500 });
    for (const position of positions) {
      const screen = graphToScreen(fit, position);
      expect(screen.x).toBeGreaterThanOrEqual(-1);
      expect(screen.x).toBeLessThanOrEqual(801);
      expect(screen.y).toBeGreaterThanOrEqual(-1);
      expect(screen.y).toBeLessThanOrEqual(501);
    }
    expect(fit.k).toBeLessThanOrEqual(1.8);
  });

  it('returns the identity transform for empty graphs and invalid viewports', () => {
    expect(computeFitTransform([], { width: 800, height: 500 })).toEqual(IDENTITY);
    expect(computeFitTransform([{ x: 10, y: 10, radius: 4 }], { width: -1, height: 0 })).toEqual(IDENTITY);
  });
});
