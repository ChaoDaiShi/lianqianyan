import { describe, expect, it } from 'vitest';
import { computeForceMesh } from './forceMesh';

const nodes = [
  { id: 'course', radius: 30 },
  { id: 'point-a', radius: 22 },
  { id: 'point-b', radius: 22 },
  { id: 'point-c', radius: 22 },
  { id: 'section-a1', radius: 15 },
  { id: 'section-a2', radius: 15 },
];

const links = [
  { source: 'course', target: 'point-a' },
  { source: 'course', target: 'point-b' },
  { source: 'course', target: 'point-c' },
  { source: 'point-a', target: 'section-a1' },
  { source: 'point-a', target: 'section-a2' },
];

describe('computeForceMesh', () => {
  it('produces a deterministic in-bounds position for every node', () => {
    const first = computeForceMesh(nodes, links, { width: 960, height: 600 });
    const second = computeForceMesh(nodes, links, { width: 960, height: 600 });

    expect(first.size).toBe(nodes.length);
    for (const node of nodes) {
      const a = first.get(node.id);
      const b = second.get(node.id);
      expect(a).toBeDefined();
      expect(b).toEqual(a);
      expect(a!.x).toBeGreaterThanOrEqual(node.radius);
      expect(a!.x).toBeLessThanOrEqual(960 - node.radius);
      expect(a!.y).toBeGreaterThanOrEqual(node.radius);
      expect(a!.y).toBeLessThanOrEqual(600 - node.radius);
    }
  });

  it('keeps linked nodes closer than unlinked far pairs', () => {
    const positions = computeForceMesh(nodes, links, { width: 960, height: 600 });
    const distance = (a: string, b: string) => {
      const pa = positions.get(a)!;
      const pb = positions.get(b)!;
      return Math.hypot(pa.x - pb.x, pa.y - pb.y);
    };
    const linked = distance('course', 'point-a');
    const spread = Math.max(
      distance('course', 'section-a1'),
      distance('section-a1', 'point-c'),
    );
    expect(linked).toBeLessThan(spread);
  });

  it('keeps every course-shaped focused layout finite after selecting each chapter group', () => {
    const pointIds = [
      'kp-deadlock',
      'kp-process-concept',
      'kp-pv',
      'kp-scheduling',
      'kp-process-sync',
    ];
    const sectionCounts = [9, 6, 8, 8, 7];
    const courseNodes = [
      { id: 'course:course-os', radius: 30 },
      ...pointIds.map((pointId) => ({
        id: `point:${pointId}`,
        radius: 22,
      })),
    ];
    const courseLinks = pointIds.flatMap((pointId, pointIndex) => [
      { source: 'course:course-os', target: `point:${pointId}` },
      ...(pointIndex > 0
        ? [{ source: `point:${pointIds[pointIndex - 1]}`, target: `point:${pointId}` }]
        : []),
    ]);

    for (let selectedPoint = 0; selectedPoint < pointIds.length; selectedPoint += 1) {
      const pointId = pointIds[selectedPoint];
      const sections = Array.from({ length: sectionCounts[selectedPoint] }, (_, sectionIndex) => ({
        id: `section:${pointId}:${sectionIndex + 1}`,
        radius: 15,
      }));
      const sectionLinks = sections.flatMap((section, sectionIndex) => [
        { source: `point:${pointId}`, target: section.id },
        ...(sectionIndex > 0
          ? [{ source: sections[sectionIndex - 1].id, target: section.id }]
          : []),
      ]);
      const positions = computeForceMesh(
        [...courseNodes, ...sections],
        [...courseLinks, ...sectionLinks],
        { width: 960, height: 600, linkLength: 148 },
      );

      for (const position of positions.values()) {
        expect(Number.isFinite(position.x)).toBe(true);
        expect(Number.isFinite(position.y)).toBe(true);
        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.x).toBeLessThanOrEqual(960);
        expect(position.y).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeLessThanOrEqual(600);
      }
    }
  });
});
