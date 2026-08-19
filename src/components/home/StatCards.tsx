import { Clock, CheckSquare, Flame, Target, type LucideIcon } from 'lucide-react';
import { stats, type StatCard } from '@/mock';
import { cn } from '@/lib/utils';

const iconMap: Record<StatCard['icon'], LucideIcon> = {
  clock: Clock,
  checkSquare: CheckSquare,
  flame: Flame,
  target: Target,
};

const accentMap: Record<StatCard['icon'], string> = {
  clock: 'bg-blue-50 text-blue-600',
  checkSquare: 'bg-emerald-50 text-emerald-600',
  flame: 'bg-orange-50 text-orange-500',
  target: 'bg-sky-50 text-sky-600',
};

/**
 * 顶部学习数据卡片（今日学习 / 今日任务 / 连续学习 / 综合掌握度）。
 */
function StatCardView({ stat }: { stat: StatCard }) {
  const Icon = iconMap[stat.icon];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{stat.label}</p>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accentMap[stat.icon])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{stat.value}</p>
    </div>
  );
}

export function StatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCardView key={stat.key} stat={stat} />
      ))}
    </div>
  );
}
