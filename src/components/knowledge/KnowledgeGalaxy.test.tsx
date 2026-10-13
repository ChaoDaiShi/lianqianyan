import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { KnowledgeGalaxy } from './KnowledgeGalaxy';

const graph = {
  courseId: 'course-os',
  generationMode: 'graph_rag_course_grounded' as const,
  nodes: [
    { id: 'course:course-os', label: '操作系统', kind: 'course' as const, knowledgePointId: null, sourceSections: ['课程大纲'] },
    { id: 'point:kp-deadlock', label: '死锁', kind: 'knowledge_point' as const, knowledgePointId: 'kp-deadlock', sourceSections: ['死锁 · 定义'] },
    { id: 'point:kp-bank', label: '银行家算法', kind: 'knowledge_point' as const, knowledgePointId: 'kp-bank', sourceSections: ['银行家算法 · 流程'] },
    { id: 'section:kp-deadlock-0', label: '死锁的定义', kind: 'section' as const, knowledgePointId: 'kp-deadlock', sourceSections: ['死锁 · 定义'] },
    { id: 'section:kp-bank-0', label: '安全序列', kind: 'section' as const, knowledgePointId: 'kp-bank', sourceSections: ['银行家算法 · 流程'] },
  ],
  edges: [
    { id: 'edge-1', source: 'course:course-os', target: 'point:kp-deadlock', relation: 'contains' as const, sourceSections: ['课程大纲'] },
    { id: 'edge-2', source: 'course:course-os', target: 'point:kp-bank', relation: 'contains' as const, sourceSections: ['课程大纲'] },
    { id: 'edge-3', source: 'point:kp-deadlock', target: 'section:kp-deadlock-0', relation: 'explains' as const, sourceSections: ['死锁 · 定义'] },
    { id: 'edge-4', source: 'point:kp-bank', target: 'section:kp-bank-0', relation: 'explains' as const, sourceSections: ['银行家算法 · 流程'] },
    { id: 'edge-5', source: 'point:kp-deadlock', target: 'point:kp-bank', relation: 'precedes' as const, sourceSections: ['死锁 · 定义', '银行家算法 · 流程'] },
  ],
  sources: ['课程大纲'],
};

describe('KnowledgeGalaxy compatibility export', () => {
  it('renders the curriculum DAG workbench and keeps GraphRAG material relations separate', () => {
    const html = renderToStaticMarkup(
      <KnowledgeGalaxy
        graph={graph}
        points={[
          { knowledgePointId: 'kp-deadlock', knowledgePointName: '死锁', masteryScore: 0.32, confidence: 0.8, evidenceCount: 3, status: 'weak', priorityScore: 1, reasonCodes: ['LOW_MASTERY'] },
          { knowledgePointId: 'kp-bank', knowledgePointName: '银行家算法', masteryScore: 0, confidence: 0, evidenceCount: 0, status: 'unassessed', priorityScore: 0, reasonCodes: ['NO_EVIDENCE'] },
        ]}
        plan={null}
        courseId="course-os"
        primaryFocusId="kp-deadlock"
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('课程知识目录');
    expect(html).toContain('GraphRAG 材料关系');
    expect(html).toContain('课程概念依赖');
    expect(html).toContain('未知状态不设锁');
    expect(html).not.toContain('拖拽');
    expect(html).not.toContain('知识星图');
  });
});
