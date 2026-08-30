import { describe, expect, it } from 'vitest';
import type { KnowledgeScene } from './knowledgePresentation';
import { buildGraphFocus } from './graphFocus';

const scene: KnowledgeScene = {
  nodes: [
    {
      id: 'course:course-os',
      label: '操作系统',
      kind: 'course',
      knowledgePointId: null,
      sourceSections: [],
      status: null,
      diagnosis: null,
      inCurrentPlan: false,
    },
    {
      id: 'point:kp-sync',
      label: '进程同步',
      kind: 'knowledge_point',
      knowledgePointId: 'kp-sync',
      sourceSections: ['同步'],
      status: null,
      diagnosis: null,
      inCurrentPlan: false,
    },
    {
      id: 'section:kp-sync:1',
      label: '临界区',
      kind: 'section',
      knowledgePointId: 'kp-sync',
      sourceSections: ['同步 · 临界区'],
      status: null,
      diagnosis: null,
      inCurrentPlan: false,
    },
    {
      id: 'section:kp-sync:2',
      label: '粒度与公平性',
      kind: 'section',
      knowledgePointId: 'kp-sync',
      sourceSections: ['同步 · 粒度与公平性'],
      status: null,
      diagnosis: null,
      inCurrentPlan: false,
    },
    {
      id: 'point:kp-pv',
      label: 'PV 操作',
      kind: 'knowledge_point',
      knowledgePointId: 'kp-pv',
      sourceSections: ['PV'],
      status: null,
      diagnosis: null,
      inCurrentPlan: false,
    },
    {
      id: 'section:kp-pv:1',
      label: 'P 操作',
      kind: 'section',
      knowledgePointId: 'kp-pv',
      sourceSections: ['PV · P 操作'],
      status: null,
      diagnosis: null,
      inCurrentPlan: false,
    },
  ],
  edges: [
    {
      id: 'c-sync',
      source: 'course:course-os',
      target: 'point:kp-sync',
      relation: 'contains',
      sourceSections: ['同步'],
    },
    {
      id: 'c-pv',
      source: 'course:course-os',
      target: 'point:kp-pv',
      relation: 'contains',
      sourceSections: ['PV'],
    },
    {
      id: 'sync-1',
      source: 'point:kp-sync',
      target: 'section:kp-sync:1',
      relation: 'explains',
      sourceSections: ['同步 · 临界区'],
    },
    {
      id: 'sync-2',
      source: 'point:kp-sync',
      target: 'section:kp-sync:2',
      relation: 'explains',
      sourceSections: ['同步 · 粒度与公平性'],
    },
    {
      id: 'pv-1',
      source: 'point:kp-pv',
      target: 'section:kp-pv:1',
      relation: 'explains',
      sourceSections: ['PV · P 操作'],
    },
  ],
};

describe('buildGraphFocus', () => {
  it('keeps the selected chapter, its siblings, all knowledge points, and valid edges', () => {
    const focus = buildGraphFocus(scene, 'section:kp-sync:2');

    expect(focus.activeKnowledgePointId).toBe('kp-sync');
    expect(focus.nodes.map(node => node.id)).toEqual([
      'course:course-os',
      'point:kp-sync',
      'section:kp-sync:1',
      'section:kp-sync:2',
      'point:kp-pv',
    ]);
    expect(
      focus.edges.every(
        edge =>
          focus.nodes.some(node => node.id === edge.source) &&
          focus.nodes.some(node => node.id === edge.target)
      )
    ).toBe(true);
  });

  it('falls back to the first knowledge point when a stale selected id is supplied', () => {
    const focus = buildGraphFocus(scene, 'section:missing');
    expect(focus.selected?.id).toBe('point:kp-sync');
    expect(focus.nodes).toContainEqual(
      expect.objectContaining({ id: 'section:kp-sync:2' })
    );
  });
});
