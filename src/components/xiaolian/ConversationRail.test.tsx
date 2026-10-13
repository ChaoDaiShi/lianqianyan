// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CompanionThread } from '@/lib/companionApi';
import { ConversationRail } from './ConversationRail';

const thread: CompanionThread = {
  id: 'thread-1',
  account_id: 'account-1',
  course_id: 'course-os',
  title: '死锁复习',
  created_at: '2026-10-05T08:00:00.000Z',
  updated_at: '2026-10-05T08:00:00.000Z',
  message_count: 4,
  memory_count: 1,
  messages: [],
  memories: [],
};

describe('ConversationRail', () => {
  it('opens the real thread list and exposes select, create, and delete actions', () => {
    const onCreate = vi.fn();
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(
      <ConversationRail
        threads={[thread]}
        activeId={thread.id}
        onCreate={onCreate}
        onSelect={onSelect}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByText(/对话历史/));
    fireEvent.click(screen.getByRole('button', { name: '打开对话 死锁复习' }));
    fireEvent.click(screen.getByRole('button', { name: '新建对话' }));
    fireEvent.click(screen.getByRole('button', { name: '删除对话 死锁复习' }));

    expect(onSelect).toHaveBeenCalledWith(thread.id);
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(thread.id);
  });
});
