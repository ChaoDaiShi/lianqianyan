import { RotateCw } from 'lucide-react';
import type { ExamAnalytics } from '@/domain';
import { Button } from '@/components/ui/button';

export interface AssessmentSnapshotProps {
  analytics: ExamAnalytics | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

function percent(value: number | null, ratio = false): string {
  if (value === null) return '暂无';
  return `${Math.round((ratio ? value * 100 : value))}%`;
}

export function AssessmentSnapshot({
  analytics,
  loading,
  error,
  onRetry,
}: AssessmentSnapshotProps) {
  if (loading && !analytics) {
    return (
      <section className="rounded-[22px] border border-violet-100 bg-white/55 p-4" aria-busy="true">
        <h3 className="text-sm font-bold">考试评测快照</h3>
        <p className="mt-4 text-sm text-[var(--em-muted-ink)]">正在汇总考试数据…</p>
      </section>
    );
  }

  if (error && !analytics) {
    return (
      <section className="rounded-[22px] border border-amber-200 bg-amber-50/65 p-4">
        <h3 className="text-sm font-bold">考试评测快照</h3>
        <p className="mt-3 text-sm text-amber-800">评测数据暂时无法读取，学习画像不受影响。</p>
        <Button type="button" variant="outline" size="sm" className="mt-3 gap-2" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          重新加载评测
        </Button>
      </section>
    );
  }

  if (!analytics || analytics.gradedCount === 0 || analytics.averagePercentage === null) {
    return (
      <section className="rounded-[22px] border border-violet-100 bg-white/55 p-4">
        <h3 className="text-sm font-bold">考试评测快照</h3>
        <p className="mt-3 font-semibold text-violet-800">评测数据暂无</p>
        <p className="mt-1 text-sm leading-6 text-[var(--em-muted-ink)]">
          尚无已评分考试。完成并评分后，这里会呈现真实成绩与知识点表现。
        </p>
        {analytics && analytics.pendingReviewCount > 0 && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {analytics.pendingReviewCount} 题待批，完成批阅后计入成绩。
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-[22px] border border-violet-100 bg-white/55 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">考试评测快照</h3>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
          {analytics.gradedCount}/{analytics.submittedCount} 份已评分
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-violet-50/80 p-3">
          <dt className="text-[10px] text-[var(--em-muted-ink)]">平均成绩</dt>
          <dd className="mt-1 text-xl font-bold text-violet-700">{percent(analytics.averagePercentage)}</dd>
        </div>
        <div className="rounded-2xl bg-sky-50/80 p-3">
          <dt className="text-[10px] text-[var(--em-muted-ink)]">最佳成绩</dt>
          <dd className="mt-1 text-xl font-bold text-sky-700">{percent(analytics.bestPercentage)}</dd>
        </div>
        <div className="rounded-2xl bg-emerald-50/80 p-3">
          <dt className="text-[10px] text-[var(--em-muted-ink)]">通过率</dt>
          <dd className="mt-1 text-lg font-bold text-emerald-700">{percent(analytics.passRate, true)}</dd>
        </div>
        <div className="rounded-2xl bg-amber-50/80 p-3">
          <dt className="text-[10px] text-[var(--em-muted-ink)]">客观题正确率</dt>
          <dd className="mt-1 text-lg font-bold text-amber-700">{percent(analytics.objectiveAccuracy, true)}</dd>
        </div>
      </dl>
      {analytics.pendingReviewCount > 0 && (
        <p className="mt-3 text-xs font-semibold text-amber-800">
          {analytics.pendingReviewCount} 题待批，成绩仍会更新
        </p>
      )}
    </section>
  );
}
