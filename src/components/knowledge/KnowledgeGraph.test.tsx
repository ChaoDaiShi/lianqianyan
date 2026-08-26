import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { KnowledgeGraph } from './KnowledgeGraph';

describe('KnowledgeGraph', () => {
  it('renders real nodes, relations and provenance', () => {
    const html = renderToStaticMarkup(
      <KnowledgeGraph
        graph={{
          courseId: 'course-os',
          generationMode: 'course_grounded',
          nodes: [
            { id: 'course:course-os', label: '操作系统', kind: 'course', knowledgePointId: null, sourceSections: ['死锁 · 定义'] },
            { id: 'point:kp-deadlock', label: '死锁', kind: 'knowledge_point', knowledgePointId: 'kp-deadlock', sourceSections: ['死锁 · 定义'] },
            { id: 'section:kp-deadlock:1', label: '定义', kind: 'section', knowledgePointId: 'kp-deadlock', sourceSections: ['死锁 · 定义'] },
          ],
          edges: [
            { id: 'e1', source: 'course:course-os', target: 'point:kp-deadlock', relation: 'contains', sourceSections: ['死锁 · 定义'] },
            { id: 'e2', source: 'point:kp-deadlock', target: 'section:kp-deadlock:1', relation: 'explains', sourceSections: ['死锁 · 定义'] },
          ],
          sources: ['死锁 · 定义'],
        }}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('课程材料知识图谱');
    expect(html).toContain('操作系统');
    expect(html).toContain('死锁');
    expect(html).toContain('包含');
    expect(html).toContain('解释');
    expect(html).toContain('死锁 · 定义');
  });
});
