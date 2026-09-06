import { describe, expect, it } from 'vitest';
import { ForceSimulation, precomputeLayout } from './forceSimulation';

function chainGraph(nodeCount: number) {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({ id: `n${index}`, radius: 16 }));
  const links = Array.from({ length: nodeCount - 1 }, (_, index) => ({ source: `n${index}`, target: `n${index + 1}` }));
  return { nodes, links };
}

describe('ForceSimulation', () => {
  it('precomputes a finite layout inside the world bounds for every node', () => {
    const { nodes, links } = chainGraph(24);
    const simulation = new ForceSimulation(nodes, links, { width: 1600, height: 1000 });
    precomputeLayout(simulation);
    for (const node of nodes) {
      const position = simulation.positionOf(node.id);
      expect(position).not.toBeNull();
      expect(Number.isFinite(position!.x)).toBe(true);
      expect(Number.isFinite(position!.y)).toBe(true);
      expect(position!.x).toBeGreaterThanOrEqual(0);
      expect(position!.x).toBeLessThanOrEqual(1600);
      expect(position!.y).toBeGreaterThanOrEqual(0);
      expect(position!.y).toBeLessThanOrEqual(1000);
    }
  });

  it('settles to rest and stays finite under stacked (identical) start positions', () => {
    const nodes = Array.from({ length: 12 }, (_, index) => ({ id: `dup-${index}`, radius: 14 }));
    const simulation = new ForceSimulation(nodes, [{ source: 'dup-0', target: 'dup-11' }], { width: 900, height: 700 });
    // 强制所有节点同点出生，构造最恶劣的发散场景
    for (let index = 0; index < nodes.length; index += 1) {
      simulation.pin(`dup-${index}`);
      simulation.movePinned(`dup-${index}`, 450, 350);
    }
    for (const node of nodes) simulation.unpin(node.id);
    for (let index = 0; index < 400; index += 1) simulation.step();
    expect(simulation.isActive()).toBe(false);
    for (const node of nodes) {
      const position = simulation.positionOf(node.id)!;
      expect(Number.isFinite(position.x)).toBe(true);
      expect(Number.isFinite(position.y)).toBe(true);
    }
  });

  it('keeps a pinned node at the dragged position and resumes motion after unpin', () => {
    const { nodes, links } = chainGraph(10);
    const simulation = new ForceSimulation(nodes, links, { width: 1200, height: 800, linkLength: 140 });
    precomputeLayout(simulation);
    simulation.pin('n0');
    simulation.movePinned('n0', 100, 120);
    for (let index = 0; index < 60; index += 1) simulation.step();
    const pinned = simulation.positionOf('n0')!;
    expect(pinned.x).toBeCloseTo(100, 6);
    expect(pinned.y).toBeCloseTo(120, 6);

    simulation.unpin('n0');
    simulation.reheat();
    let moved = false;
    for (let index = 0; index < 40; index += 1) {
      simulation.step();
      const position = simulation.positionOf('n0')!;
      if (Math.hypot(position.x - pinned.x, position.y - pinned.y) > 0.5) {
        moved = true;
        break;
      }
    }
    expect(moved).toBe(true);
  });

  it('is deterministic for the same graph', () => {
    const { nodes, links } = chainGraph(16);
    const first = new ForceSimulation(nodes, links, { width: 1200, height: 800 });
    const second = new ForceSimulation(nodes, links, { width: 1200, height: 800 });
    precomputeLayout(first);
    precomputeLayout(second);
    for (const node of nodes) {
      expect(first.positionOf(node.id)).toEqual(second.positionOf(node.id));
    }
  });
});
