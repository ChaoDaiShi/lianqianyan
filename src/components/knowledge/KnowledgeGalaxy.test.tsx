import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { KnowledgeGalaxy } from './KnowledgeGalaxy';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

const fixtureGraph = {
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
  ],
  sources: ['课程大纲'],
};

function renderGalaxy() {
  return renderToStaticMarkup(
    <KnowledgeGalaxy
      graph={fixtureGraph}
      points={[{
        knowledgePointId: 'kp-deadlock', knowledgePointName: '死锁',
        masteryScore: 0.32, confidence: 0.8, evidenceCount: 3,
        status: 'weak', priorityScore: 1, reasonCodes: ['LOW_MASTERY'],
      }]}
      plan={null}
      courseId="course-os"
      primaryFocusId="kp-deadlock"
      loading={false}
      error={false}
      onRetry={vi.fn()}
    />,
  );
}

describe('KnowledgeGalaxy', () => {
  it('renders one combined real graph scene and a collapsed provenance list', () => {
    const html = renderGalaxy();
    expect(html).toContain('data-knowledge-scene="combined"');
    expect(html).toContain('课程大纲');
    expect(html).toContain('<details');
    expect(html).not.toContain('掌握状态星海');
    expect(html).not.toContain('32%<!-- -->%');
  });

  it('renders the full graph without focus filtering and exposes free-exploration affordances', () => {
    const html = renderGalaxy();
    // 默认聚焦在死锁，但另一个知识点与其章节也必须同时可见（星图不做邻域过滤）
    expect(html).toContain('死锁');
    expect(html).toContain('银行家算法');
    expect(html).toContain('安全序列');
    expect(html).toContain('可自由拖拽缩放的课程知识星图');
    expect(html).toContain('拖拽空白平移');
    expect(html).toContain('点击节点查看知识详情');
    expect(html).toContain('NODE DETAIL');
    expect(html).toContain('适配全图');
  });

  it('marks section nodes of the focused point as selectable detail entries', () => {
    const html = renderGalaxy();
    expect(html).toContain('回车查看详情');
    expect(html).toContain('知识点内容');
  });
});
