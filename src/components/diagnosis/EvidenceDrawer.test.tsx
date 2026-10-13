import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { EvidenceDrawer } from './EvidenceDrawer';

describe('EvidenceDrawer', () => {
  it('shows real scoped event time, source, outcome, and keeps unknown mastery unknown', () => {
    const html = renderToStaticMarkup(
      <EvidenceDrawer
        point={{
          knowledgePointId: 'kp-cycle',
          knowledgePointName: '循环链表',
          masteryScore: 0,
          confidence: 0,
          evidenceCount: 1,
          status: 'unassessed',
          priorityScore: 0,
          reasonCodes: ['NO_EVIDENCE'],
        }}
        events={[
          {
            id: 'event-1',
            learnerId: 'account:user-1',
            courseId: 'course-os',
            evidenceType: 'practice_answer_evaluated',
            source: 'learning_space',
            knowledgePointId: 'kp-cycle',
            questionId: 'q-cycle-1',
            sessionId: 'session-1',
            masteryDelta: 0,
            payload: { is_correct: false, feedback: '检查尾结点的 next 指向。' },
            occurredAt: '2026-10-13T08:30:00.000Z',
          },
        ]}
        loading={false}
        error={false}
        inCurrentPlan={true}
        planTask={{
          id: 'task-cycle',
          planId: 'plan-1',
          draftKey: 'cycle',
          knowledgePointId: 'kp-cycle',
          knowledgePointName: '循环链表',
          actionType: 'assess',
          priority: 1,
          estimatedMinutes: 4,
          reasonCodes: ['NEEDS_ASSESSMENT'],
          sourceStatus: 'unassessed',
          sourcePriorityScore: 0.4,
          order: 1,
          createdAt: '2026-10-13T08:00:00.000Z',
        }}
        planLoading={false}
        planError={false}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('循环链表');
    expect(html).toContain('未知');
    expect(html).not.toContain('掌握度 0%');
    expect(html).toContain('2026-10-13T08:30:00.000Z');
    expect(html).toContain('学习空间');
    expect(html).toContain('错误');
    expect(html).toContain('检查尾结点的 next 指向。');
    expect(html).toContain('下一步：快速评估「循环链表」· 预计 4 分钟');
  });

  it('keeps the route relation unresolved while the real current plan is loading', () => {
    const html = renderToStaticMarkup(
      <EvidenceDrawer
        point={{
          knowledgePointId: 'kp-cycle',
          knowledgePointName: '循环链表',
          masteryScore: 0,
          confidence: 0,
          evidenceCount: 0,
          status: 'unassessed',
          priorityScore: 0,
          reasonCodes: ['NO_EVIDENCE'],
        }}
        events={[]}
        loading={false}
        error={false}
        inCurrentPlan={null}
        planTask={null}
        planLoading={true}
        planError={false}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('正在读取当前学习计划');
    expect(html).not.toContain('未包含该知识点');
  });
});
