import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PersistedStudyTask } from '@/domain';
import { QuestCard } from './QuestCard';

const task: PersistedStudyTask = {
  id: 'task-list-insert',
  planId: 'plan-1',
  draftKey: 'list-insert',
  knowledgePointId: 'data-structures.linked-list.insert',
  knowledgePointName: '单链表插入',
  actionType: 'remediate',
  priority: 1,
  estimatedMinutes: 25,
  reasonCodes: ['PRIMARY_FOCUS', 'NEEDS_MORE_EVIDENCE'],
  sourceStatus: 'weak',
  sourcePriorityScore: 0.8,
  order: 2,
  createdAt: '2026-10-13T08:00:00Z',
};

describe('QuestCard study work order', () => {
  it('shows the persisted task action, diagnosis source, reasons, and estimate', () => {
    const html = renderToStaticMarkup(<QuestCard task={task} index={0} onStart={() => undefined} />);

    expect(html).toContain('单链表插入');
    expect(html).toContain('预计 25 分钟');
    expect(html).toContain('诊断状态：薄弱');
    expect(html).toContain('首要关注');
    expect(html).toContain('需要更多证据');
    expect(html).toContain('开始工单');
    expect(html).not.toMatch(/金币|经验|星级|锁定/);
  });
});
