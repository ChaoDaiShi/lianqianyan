import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { KnowledgeGraphData } from '@/lib/educationApi';
import { KnowledgeDAG } from './KnowledgeDAG';

const graph: KnowledgeGraphData = {
  courseId: 'course-os',
  generationMode: 'graph_rag_course_grounded',
  nodes: [
    { id: 'course:course-os', label: '操作系统', kind: 'course', knowledgePointId: null, sourceSections: ['课程材料'] },
    { id: 'point:kp-list', label: '线性表', kind: 'knowledge_point', knowledgePointId: 'kp-list', sourceSections: ['线性表 · 定义'] },
    { id: 'point:kp-insert', label: '单链表插入', kind: 'knowledge_point', knowledgePointId: 'kp-insert', sourceSections: ['单链表插入 · 操作'] },
    { id: 'section:kp-insert:1', label: '操作步骤', kind: 'section', knowledgePointId: 'kp-insert', sourceSections: ['单链表插入 · 操作'] },
  ],
  edges: [
    { id: 'contains:1', source: 'course:course-os', target: 'point:kp-list', relation: 'contains', sourceSections: ['课程材料'] },
    { id: 'contains:2', source: 'course:course-os', target: 'point:kp-insert', relation: 'contains', sourceSections: ['课程材料'] },
    { id: 'explains:1', source: 'point:kp-insert', target: 'section:kp-insert:1', relation: 'explains', sourceSections: ['单链表插入 · 操作'] },
    { id: 'precedes:1', source: 'point:kp-list', target: 'point:kp-insert', relation: 'precedes', sourceSections: ['线性表 · 定义', '单链表插入 · 操作'] },
  ],
  sources: ['线性表 · 定义', '单链表插入 · 操作'],
};

const points = [
  {
    knowledgePointId: 'kp-list', knowledgePointName: '线性表', masteryScore: 0, confidence: 0,
    evidenceCount: 0, status: 'unassessed' as const, priorityScore: 0, reasonCodes: ['NO_EVIDENCE' as const],
  },
  {
    knowledgePointId: 'kp-insert', knowledgePointName: '单链表插入', masteryScore: 0.42, confidence: 0.7,
    evidenceCount: 2, status: 'weak' as const, priorityScore: 0.8, reasonCodes: ['LOW_MASTERY' as const],
  },
];

describe('KnowledgeDAG', () => {
  it('draws explicit course prerequisite arrows and keeps GraphRAG relations in the detail record', () => {
    const html = renderToStaticMarkup(
      <KnowledgeDAG
        graph={graph}
        points={points}
        topics={[]}
        courseId="course-os"
      />,
    );

    expect(html).toContain('aria-label="先修关系概念图"');
    expect(html).toContain('aria-label="课程知识目录"');
    expect(html).toContain('先修箭头来自课程材料显式声明的依赖');
    expect(html).toContain('GraphRAG 材料关系');
    expect(html).toContain('先修依赖');
    expect(html).toContain('1 条先修关系');
    expect(html).toContain('未知状态不设锁');
    expect(html).not.toContain('自由拖拽');
  });
});
