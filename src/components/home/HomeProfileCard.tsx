import { Loader2, AlertTriangle, RotateCw, Target } from 'lucide-react';
import { useLearnerProfile } from '@/lib/hooks';
import { DEMO_LEARNER_ID, DEMO_COURSE_ID } from '@/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function pct(value: number | null): string {
  if (value == null) return '--';
  return `${Math.round(value * 100)}%`;
}

/**
 * 首页 Profile 卡 —— 真实 LearnerProfile（GET /api/profile/demo-user-001）。
 * 综合掌握度 / 画像可信度 / 诊断覆盖率 / 已评估知识点，全部来自 API，禁止硬编码。
 * overall_mastery = null → 显示「暂无足够数据」（禁止 0% / NaN%）。
 */
export function HomeProfileCard() {
  const { data, loading, error, refetch } = useLearnerProfile(
    DEMO_LEARNER_ID,
    DEMO_COURSE_ID
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-900">我的学习画像</h2>
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 py-6 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">正在读取你的学习画像…</span>
        </div>
      )}

      {error && (
        <div className="mt-4 flex flex-col items-start gap-3 py-4">
          <div className="flex items-center gap-2 text-gray-500">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">暂时无法读取学习状态</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="gap-1.5"
          >
            <RotateCw className="h-3.5 w-3.5" />
            重新加载
          </Button>
        </div>
      )}

      {data && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Metric
            label="综合掌握度"
            value={
              data.insufficientData || data.overallMastery == null
                ? '暂无足够数据'
                : pct(data.overallMastery)
            }
            accent={data.insufficientData ? false : true}
          />
          <Metric
            label="画像可信度"
            value={
              data.overallConfidence == null ? '--' : pct(data.overallConfidence)
            }
            hint="覆盖度 × 平均置信"
          />
          <Metric
            label="诊断覆盖率"
            value={pct(data.coverage)}
            hint={`${data.assessedCount} / ${data.totalKnowledgePoints} 个知识点已评估`}
          />
          <Metric
            label="已评估知识点"
            value={`${data.assessedCount} / ${data.totalKnowledgePoints}`}
            hint="含薄弱 / 发展中 / 熟练 / 掌握"
          />
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p
        className={cn(
          'mt-1.5 text-xl font-bold tracking-tight',
          value === '暂无足够数据' || value === '--'
            ? 'text-gray-400'
            : accent
              ? 'text-blue-700'
              : 'text-gray-900'
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}
