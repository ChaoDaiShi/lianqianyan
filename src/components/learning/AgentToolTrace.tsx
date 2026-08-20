import type { AgentTraceItem } from '@/lib/educationApi';
import { cn } from '@/lib/utils';

export function AgentToolTrace({
  items,
  compact = false,
}: {
  items: AgentTraceItem[];
  compact?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <p className="text-[10px] text-gray-400">真实执行链路</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <div key={`${item.name ?? item.agent}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-[10px] text-gray-300">→</span>}
            <span
              className={cn(
                item.type === 'tool'
                  ? 'rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-[9px] text-indigo-700'
                  : 'rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-blue-700 shadow-sm',
                compact && item.type === 'agent' && 'px-2 py-0.5 text-[9px]',
                item.status === 'failed' && 'border-red-200 bg-red-50 text-red-600'
              )}
            >
              {item.type === 'tool' ? item.name ?? item.agent : item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
