import { describe, expect, it } from 'vitest';
import { buildCurriculumMatrix } from './curriculumMatrix';

describe('buildCurriculumMatrix', () => {
  it('places each diagnosis under its actual graph concept and source sections', () => {
    const matrix = buildCurriculumMatrix(
      [
        {
          knowledgePointId: 'kp-deadlock',
          knowledgePointName: '死锁',
          masteryScore: 0.5,
          confidence: 0.6,
          evidenceCount: 2,
          status: 'developing',
          priorityScore: 0.5,
          reasonCodes: ['LIMITED_EVIDENCE'],
        },
      ],
      {
        nodes: [
          { id: 'point:kp-deadlock', label: '死锁', kind: 'knowledge_point', knowledgePointId: 'kp-deadlock', sourceSections: ['死锁 · 定义'] },
          { id: 'section:kp-deadlock:1', label: '定义与条件', kind: 'section', knowledgePointId: 'kp-deadlock', sourceSections: ['死锁 · 定义'] },
        ],
      },
    );

    expect(matrix).toEqual([
      {
        knowledgePointId: 'kp-deadlock',
        title: '死锁',
        sections: ['定义与条件'],
        status: 'developing',
      },
    ]);
  });
});
