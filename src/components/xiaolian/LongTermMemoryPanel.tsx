import { useState } from 'react';
import { Brain, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { CompanionMemory } from '@/lib/companionApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LongTermMemoryPanelProps {
  memories: CompanionMemory[];
  busy: boolean;
  onAdd(content: string): void;
  onDelete(id: string): void;
}

export function LongTermMemoryPanel({
  memories,
  busy,
  onAdd,
  onDelete,
}: LongTermMemoryPanelProps) {
  const [value, setValue] = useState('');
  return (
    <details className="group rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--em-ink)]">
          <Brain className="h-4 w-4 text-[var(--em-muted-ink)]" />
          长期记忆
          <span className="font-normal text-[var(--em-muted-ink)]">{memories.length}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--em-muted-ink)] transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 border-t border-[var(--em-border)] pt-3">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const content = value.trim();
            if (!content || busy) return;
            onAdd(content);
            setValue('');
          }}
        >
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={500}
            placeholder="例如：更喜欢先看例子再学定义"
            aria-label="添加长期记忆内容"
            className="h-10"
          />
          <Button
            type="submit"
            disabled={busy || !value.trim()}
            className="h-10 w-10 shrink-0"
            aria-label="添加长期记忆"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>
        <ul className="mt-3 space-y-2">
          {memories.map((memory) => (
            <li key={memory.id} className="flex items-start gap-2 rounded-lg bg-[var(--em-surface-subtle)] px-3 py-2.5 text-sm leading-6">
              <span className="min-w-0 flex-1">{memory.content}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDelete(memory.id)}
                className="mt-0.5 rounded p-1 text-[var(--em-muted-ink)] hover:bg-slate-200 disabled:opacity-50"
                aria-label={`删除长期记忆 ${memory.content}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        {memories.length === 0 && (
          <p className="mt-3 text-sm leading-6 text-[var(--em-muted-ink)]">
            只保存你主动添加的内容；可以查看并删除已保存的记忆。
          </p>
        )}
      </div>
    </details>
  );
}
