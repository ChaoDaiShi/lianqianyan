import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { KnowledgeGalaxy } from './KnowledgeGalaxy';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

describe('KnowledgeGalaxy', () => {
  it('renders one combined real graph scene and a collapsed provenance list', () => {
    const html = renderToStaticMarkup(
      <KnowledgeGalaxy
        graph={{
          courseId: 'course-os',
          generationMode: 'course_grounded',
          nodes: [
            { id: 'course:course-os', label: '操作系统', kind: 'course', knowledgePointId: null, sourceSections: ['课程大纲'] },
            { id: 'point:kp-deadlock', label: '死锁', kind: 'knowledge_point', knowledgePointId: 'kp-deadlock', sourceSections: ['死锁 · 定义'] },
          ],
          edges: [{ id: 'edge-1', source: 'course:course-os', target: 'point:kp-deadlock', relation: 'contains', sourceSections: ['课程大纲'] }],
          sources: ['课程大纲'],
        }}
        points={[{
          knowledgePointId: 'kp-deadlock', knowledgePointName: '死锁',
          masteryScore: 0.32, confidence: 0.8, evidenceCount: 3,
          status: 'weak', priorityScore: 1, reasonCodes: ['LOW_MASTERY'],
        }]}
        plan={null}
        primaryFocusId="kp-deadlock"
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('data-knowledge-scene="combined"');
    expect(html).toContain('课程大纲');
    expect(html).toContain('<details');
    expect(html).not.toContain('掌握状态星海');
    expect(html).not.toContain('32%<!-- -->%');
  });
});
