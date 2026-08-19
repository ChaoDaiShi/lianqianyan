import { ArrowRight, CalendarDays, PlayCircle } from 'lucide-react';
import { planOverview } from '@/mock';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStartLearning } from '@/components/learning/useStartLearning';

/**
 * 当前学习计划卡片。
 * 展示总体进度、剩余天数、各课程掌握度，并突出当前重点课程。
 */
export function PlanOverviewCard() {
  const { starting, start } = useStartLearning();
  const handleContinue = () => {
    void start({
      source: 'current_study_plan',
      topic: planOverview.todayTopic,
    });
  };
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* 头部 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{planOverview.name}</h2>
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
            <span>总体进度</span>
            <span className="font-semibold text-gray-900">
              {Math.round(planOverview.overallProgress * 100)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
          <CalendarDays className="h-4 w-4" />
          距离目标 {planOverview.daysToTarget} 天
        </div>
      </div>

      {/* 总体进度条 */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${planOverview.overallProgress * 100}%` }}
        />
      </div>

      {/* 课程掌握度 */}
      <div className="mt-5 space-y-3">
        {planOverview.courses.map((course) => (
          <div
            key={course.id}
            className={cn(
              'rounded-xl border p-3',
              course.isFocus
                ? 'border-blue-200 bg-blue-50/60'
                : 'border-gray-100 bg-gray-50/50'
            )}
          >
            <div className="flex items-center justify-between text-sm">
              <span
                className={cn(
                  'font-medium',
                  course.isFocus ? 'text-blue-700' : 'text-gray-700'
                )}
              >
                {course.name}
              </span>
              <span
                className={cn(
                  'font-semibold',
                  course.isFocus ? 'text-blue-700' : 'text-gray-700'
                )}
              >
                {Math.round(course.mastery * 100)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white">
              <div
                className={cn(
                  'h-full rounded-full',
                  course.isFocus ? 'bg-blue-600' : 'bg-gray-300'
                )}
                style={{ width: `${course.mastery * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 今日学习 + 按钮 */}
      <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
        <div>
          <p className="text-xs text-gray-400">今日学习</p>
          <p className="text-sm font-semibold text-gray-800">{planOverview.todayTopic}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleContinue} disabled={starting}>
          <PlayCircle className="h-4 w-4" />
          {starting ? '小涟正在记录…' : '继续学习'}
          {!starting && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
