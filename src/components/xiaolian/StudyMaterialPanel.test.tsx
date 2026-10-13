// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudyMaterialPanel } from './StudyMaterialPanel';

const hookMocks = vi.hoisted(() => ({
  useCurrentPlan: vi.fn(),
  useKnowledgePoint: vi.fn(),
  fetchKnowledgeGraph: vi.fn(),
}));

vi.mock('@/lib/hooks', () => ({
  useCurrentPlan: hookMocks.useCurrentPlan,
  useKnowledgePoint: hookMocks.useKnowledgePoint,
}));
vi.mock('@/lib/educationApi', () => ({ fetchKnowledgeGraph: hookMocks.fetchKnowledgeGraph }));

const plan = {
  id: 'plan-1',
  learnerId: 'account:user-1',
  courseId: 'course-os',
  status: 'active' as const,
  strategy: 'balanced' as const,
  generatedAt: '2026-10-13T08:00:00.000Z',
  sourceDiagnosisGeneratedAt: '2026-10-13T08:00:00.000Z',
  reasonCodes: [],
  createdAt: '2026-10-13T08:00:00.000Z',
  updatedAt: '2026-10-13T08:00:00.000Z',
  tasks: [
    { id: 'task-list', planId: 'plan-1', draftKey: 'list', knowledgePointId: 'kp-list', knowledgePointName: '线性表', actionType: 'practice', priority: 1, estimatedMinutes: 10, reasonCodes: [], sourceStatus: 'weak' as const, sourcePriorityScore: 0.7, order: 1, createdAt: '2026-10-13T08:00:00.000Z' },
    { id: 'task-stack', planId: 'plan-1', draftKey: 'stack', knowledgePointId: 'kp-stack', knowledgePointName: '栈与队列', actionType: 'learn', priority: 2, estimatedMinutes: 8, reasonCodes: [], sourceStatus: 'unassessed' as const, sourcePriorityScore: 0.2, order: 2, createdAt: '2026-10-13T08:00:00.000Z' },
  ],
};

describe('StudyMaterialPanel', () => {
  beforeEach(() => {
    hookMocks.useCurrentPlan.mockReturnValue({ plan, loading: false, error: false });
    hookMocks.useKnowledgePoint.mockImplementation((id: string) => ({
      loading: false,
      error: false,
      data: id === 'kp-stack'
        ? { knowledgePointId: id, title: '栈与队列', sections: [{ title: '先进先出', content: '队列按 FIFO 规则出队。' }] }
        : { knowledgePointId: id, title: '线性表教材', sections: [{ title: '线性表定义', content: '线性表是 $O(n)$ 可定位的数据结构。' }] },
    }));
    hookMocks.fetchKnowledgeGraph.mockResolvedValue({
      nodes: [{ id: 'point:kp-list', kind: 'knowledge_point', knowledgePointId: 'kp-list', label: '线性表' }, { id: 'point:kp-pointer', kind: 'knowledge_point', knowledgePointId: 'kp-pointer', label: '指针基础' }],
      edges: [{ source: 'point:kp-pointer', target: 'point:kp-list', relation: 'precedes' }],
    });
  });

  it('loads current plan material and switches it with the selected task', async () => {
    render(<StudyMaterialPanel />);

    expect(await screen.findByText('线性表定义')).toBeTruthy();
    expect(screen.getByText('指针基础')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('当前计划知识点'), { target: { value: 'task-stack' } });
    await waitFor(() => expect(screen.getByText('先进先出')).toBeTruthy());
    expect(screen.queryByText('线性表定义')).toBeNull();
  });
});
