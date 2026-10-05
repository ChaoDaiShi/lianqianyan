import { useState } from 'react';
import { Brain, Plus, Trash2 } from 'lucide-react';
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
    <details className='rounded-2xl border border-violet-100 bg-white/50 p-4'>
      <summary className='flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-primary-700'>
        <Brain className='h-[18px] w-[18px]' />
        长期记忆{' '}
        <span className='font-normal text-[var(--em-muted-ink)]'>
          {memories.length}
        </span>
      </summary>
      <div className='mt-3 flex gap-2'>
        <Input
          value={value}
          onChange={event => setValue(event.target.value)}
          maxLength={500}
          placeholder='例如：更喜欢先看例子再学定义'
          className='h-11 rounded-xl'
        />
        <Button
          type='button'
          size='icon'
          disabled={busy || !value.trim()}
          onClick={() => {
            onAdd(value.trim());
            setValue('');
          }}
          className='h-11 w-11 shrink-0 rounded-xl'
          aria-label='添加长期记忆'
        >
          <Plus className='h-4 w-4' />
        </Button>
      </div>
      <ul className='mt-3 space-y-2'>
        {memories.map(memory => (
          <li
            key={memory.id}
            className='flex items-start gap-2 rounded-xl bg-violet-50/60 px-3 py-2.5 text-sm leading-6'
          >
            <span className='min-w-0 flex-1'>{memory.content}</span>
            <button
              type='button'
              onClick={() => onDelete(memory.id)}
              className='mt-0.5 text-slate-400 hover:text-rose-500'
              aria-label='删除长期记忆'
            >
              <Trash2 className='h-3.5 w-3.5' />
            </button>
          </li>
        ))}
      </ul>
      {memories.length === 0 ? (
        <p className='mt-3 text-[13px] leading-6 text-[var(--em-muted-ink)]'>
          只保存你主动添加的内容，不把普通对话自动当作长期事实。
        </p>
      ) : null}
    </details>
  );
}
