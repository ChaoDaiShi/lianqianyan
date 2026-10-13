import { describe, expect, it } from 'vitest';
import { buildPrerequisiteDag } from './prerequisiteDag';

const points = [
  {
    knowledgePointId: 'kp-list',
    knowledgePointName: '线性表',
    masteryScore: 0,
    confidence: 0,
    evidenceCount: 0,
    status: 'unassessed' as const,
    priorityScore: 0,
    reasonCodes: ['NO_EVIDENCE' as const],
  },
  {
    knowledgePointId: 'kp-insert',
    knowledgePointName: '单链表插入',
    masteryScore: 0.42,
    confidence: 0.7,
    evidenceCount: 2,
    status: 'weak' as const,
    priorityScore: 0.8,
    reasonCodes: ['LOW_MASTERY' as const],
  },
];

describe('buildPrerequisiteDag', () => {
  it('uses only catalog prerequisite records and keeps missing mastery unknown', () => {
    const dag = buildPrerequisiteDag(points, [
      {
        knowledgePointId: 'kp-insert',
        prerequisites: [{ id: 'kp-list', name: '线性表' }],
      },
    ]);

    expect(dag.edges).toEqual([{ source: 'kp-list', target: 'kp-insert' }]);
    expect(dag.nodes.find((node) => node.id === 'kp-list')).toMatchObject({
      label: '线性表',
      status: 'unassessed',
      column: 0,
    });
    expect(dag.nodes.find((node) => node.id === 'kp-insert')).toMatchObject({
      label: '单链表插入',
      status: 'weak',
      column: 1,
    });
  });

  it('keeps an unmapped catalog prerequisite visible with an unknown state', () => {
    const dag = buildPrerequisiteDag(points, [
      {
        knowledgePointId: 'kp-insert',
        prerequisites: [{ id: 'kp-pointer-basics', name: '指针基础' }],
      },
    ]);

    expect(dag.edges).toContainEqual({
      source: 'kp-pointer-basics',
      target: 'kp-insert',
    });
    expect(dag.nodes.find((node) => node.id === 'kp-pointer-basics')).toMatchObject({
      label: '指针基础',
      status: null,
      column: 0,
    });
  });
});
