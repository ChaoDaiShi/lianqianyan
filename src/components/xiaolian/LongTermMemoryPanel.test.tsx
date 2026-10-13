// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LongTermMemoryPanel } from './LongTermMemoryPanel';

describe('LongTermMemoryPanel', () => {
  it('lets the learner add and remove an actual listed memory', () => {
    const onAdd = vi.fn();
    const onDelete = vi.fn();
    const { rerender } = render(
      <LongTermMemoryPanel memories={[]} busy={false} onAdd={onAdd} onDelete={onDelete} />,
    );

    fireEvent.click(screen.getByText('长期记忆'));
    fireEvent.change(screen.getByLabelText('添加长期记忆内容'), {
      target: { value: '更喜欢用 C++ 作答' },
    });
    fireEvent.click(screen.getByRole('button', { name: '添加长期记忆' }));
    expect(onAdd).toHaveBeenCalledWith('更喜欢用 C++ 作答');

    rerender(
      <LongTermMemoryPanel
        memories={[{
          id: 'memory-1',
          content: '更喜欢用 C++ 作答',
          source_message_id: null,
          created_at: '2026-10-13T08:00:00.000Z',
        }]}
        busy={false}
        onAdd={onAdd}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '删除长期记忆 更喜欢用 C++ 作答' }));
    expect(onDelete).toHaveBeenCalledWith('memory-1');
  });
});
