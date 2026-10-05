import {
  ChevronDown,
  History,
  MessageCirclePlus,
  Trash2,
} from 'lucide-react';
import type { CompanionThread } from '@/lib/companionApi';

interface ConversationRailProps {
  threads: CompanionThread[];
  activeId: string | null;
  onCreate(): void;
  onSelect(id: string): void;
  onDelete(id: string): void;
}

function ThreadList({
  threads,
  activeId,
  onSelect,
  onDelete,
}: Omit<ConversationRailProps, 'onCreate'>) {
  return (
    <div className="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-0.5">
      {threads.map((thread) => (
        <div
          key={thread.id}
          className={`group flex min-w-0 items-center gap-1 rounded-2xl border p-1 ${
            thread.id === activeId
              ? 'border-primary-200 bg-violet-50/80'
              : 'border-transparent bg-white/55'
          }`}
        >
          <button
            type="button"
            onClick={() => onSelect(thread.id)}
            className="min-w-0 flex-1 px-2 py-2 text-left"
          >
            <strong className="block truncate text-xs">{thread.title}</strong>
            <span className="mt-1 block text-[10px] text-[var(--em-muted-ink)]">
              {thread.message_count} 条消息 · {thread.memory_count} 条记忆
            </span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(thread.id)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500"
            aria-label={`删除对话 ${thread.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      {threads.length === 0 && (
        <p className="px-2 py-5 text-center text-xs text-[var(--em-muted-ink)]">
          还没有历史对话。
        </p>
      )}
    </div>
  );
}

function RailHeader({ onCreate }: { onCreate(): void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <p className="flex items-center gap-1.5 text-xs font-bold text-primary-700">
        <History className="h-4 w-4" />
        历史记录
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="grid h-8 w-8 place-items-center rounded-xl bg-violet-100 text-primary-700"
        aria-label="新建对话"
      >
        <MessageCirclePlus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ConversationRail({
  threads,
  activeId,
  onCreate,
  onSelect,
  onDelete,
}: ConversationRailProps) {
  const active = threads.find((thread) => thread.id === activeId) ?? null;
  const listProps = { threads, activeId, onSelect, onDelete };

  return (
    <>
      <details
        data-conversation-context="collapsible"
        className="group rounded-[1.5rem] border border-violet-100 bg-white/55 p-3 backdrop-blur-xl xl:hidden"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold text-primary-700">
              <History className="h-4 w-4" />
              对话与记忆上下文
            </p>
            <p className="mt-1 truncate text-[10px] text-[var(--em-muted-ink)]">
              {active
                ? `${active.title} · ${active.message_count} 条消息`
                : '展开查看历史对话'}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-primary-600 transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 border-t border-violet-100 pt-3">
          <RailHeader onCreate={onCreate} />
          <ThreadList {...listProps} />
        </div>
      </details>

      <aside
        data-conversation-context="desktop"
        className="hidden rounded-[1.75rem] border border-violet-100 bg-white/55 p-3 backdrop-blur-xl xl:block"
        aria-label="对话历史"
      >
        <RailHeader onCreate={onCreate} />
        <ThreadList {...listProps} />
      </aside>
    </>
  );
}
