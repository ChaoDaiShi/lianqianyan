import { Check, Minus, Circle } from 'lucide-react';
import { todayTasks } from '@/mock';
import { cn } from '@/lib/utils';

const statusMeta = {
  completed: {
    icon: Check,
    dotClass: 'bg-emerald-500',
    iconClass: 'bg-emerald-50 text-emerald-600',
  },
  in_progress: {
    icon: Minus,
    dotClass: 'bg-blue-500',
    iconClass: 'bg-blue-50 text-blue-600',
  },
  todo: {
    icon: Circle,
    dotClass: 'bg-gray-300',
    iconClass: 'bg-gray-50 text-gray-400',
  },
} as const;

/**
 * 今日学习任务卡片。
 */
export function TodayTasksCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h2 className="text-lg font-bold text-gray-900">今日学习任务</h2>
      <div className="mt-4 space-y-1">
        {todayTasks.map((task) => {
          const meta = statusMeta[task.status];
          const StatusIcon = meta.icon;
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-gray-50"
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  meta.iconClass
                )}
              >
                <StatusIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">
                  {task.course ? `${task.course} · ${task.title}` : task.title}
                </p>
              </div>
              <span className="shrink-0 text-xs text-gray-400">{task.meta}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
