import { renderToStaticMarkup } from 'react-dom/server';
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
  it('collapses history into a mobile context bar while keeping a desktop rail', () => {
    const html = renderToStaticMarkup(
      <ConversationRail
        threads={[thread]}
        activeId={thread.id}
        onCreate={vi.fn()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(html).toContain('data-conversation-context="collapsible"');
    expect(html).toContain('data-conversation-context="desktop"');
    expect(html).toContain('<details');
    expect(html).toContain('对话与记忆上下文');
    expect(html).toContain('死锁复习');
  });
});
