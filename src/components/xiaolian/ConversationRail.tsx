import { ChevronDown, History, MessageCirclePlus, Trash2 } from 'lucide-react';
import type { CompanionThread } from '@/lib/companionApi';

interface ConversationRailProps {
  threads: CompanionThread[];
  activeId: string | null;
  onCreate(): void;
  onSelect(id: string): void;
  onDelete(id: string): void;
}

export function ConversationRail({
  threads,
  activeId,
  onCreate,
  onSelect,
  onDelete,
}: ConversationRailProps) {
  const active = threads.find((thread) => thread.id === activeId) ?? null;

  return (
    <div className="flex min-w-0 items-start gap-2 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] p-3">
      <details data-conversation-context="collapsible" className="group min-w-0 flex-1">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--em-ink)]">
              <History className="h-4 w-4 shrink-0 text-[var(--em-muted-ink)]" />对话历史
            </span>
            <span className="mt-1 block truncate text-xs text-[var(--em-muted-ink)]">
              {active ? `${active.title} · ${active.message_count} 条消息` : '展开查看已有对话'}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--em-muted-ink)] transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto border-t border-[var(--em-border)] pt-3">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={`flex min-w-0 items-center gap-1 rounded-lg border p-1 ${
                thread.id === activeId
                  ? 'border-[var(--em-primary)] bg-[var(--em-primary-subtle)]'
                  : 'border-[var(--em-border)] bg-[var(--em-surface)]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(thread.id)}
                aria-label={`打开对话 ${thread.title}`}
                className="min-w-0 flex-1 px-2 py-2 text-left"
              >
                <strong className="block truncate text-sm">{thread.title}</strong>
                <span className="mt-1 block text-xs text-[var(--em-muted-ink)]">
                  {thread.message_count} 条消息 · {thread.memory_count} 条记忆
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(thread.id)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--em-muted-ink)] hover:bg-[var(--em-surface-subtle)]"
                aria-label={`删除对话 ${thread.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {threads.length === 0 && (
            <p className="px-2 py-3 text-sm text-[var(--em-muted-ink)]">还没有历史对话。</p>
          )}
        </div>
      </details>
      <button
        type="button"
        onClick={onCreate}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--em-border)] text-[var(--em-ink)] hover:bg-[var(--em-surface-subtle)]"
        aria-label="新建对话"
      >
        <MessageCirclePlus className="h-4 w-4" />
      </button>
    </div>
  );
}
