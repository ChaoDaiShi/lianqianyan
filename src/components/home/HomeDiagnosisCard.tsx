import { Loader2, AlertTriangle, RotateCw, Focus } from 'lucide-react';
import { useDiagnosis } from '@/lib/hooks';
import { DEMO_LEARNER_ID, DEMO_COURSE_ID } from '@/store';
import { DIAGNOSIS_STATUS_LABEL, DIAGNOSIS_REASON_TEXT } from '@/domain';
import type { DiagnosisReasonCode } from '@/domain';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

const REASON_MAP: Record<string, string> = {
  NO_EVIDENCE: '尚未完成有效评估。',
  LIMITED_EVIDENCE: '有效练习记录较少，判断可信度有限。',
  LOW_MASTERY: '当前掌握度偏低。',
  ADEQUATE_MASTERY: '当前掌握情况尚可。',
  STRONG_MASTERY: '当前掌握情况良好。',
};

function reasonText(codes: DiagnosisReasonCode[]): string {
  if (codes.length === 0) return '当前掌握度偏低，建议优先补强。';
  return codes.map((c) => REASON_MAP[c] ?? DIAGNOSIS_REASON_TEXT[c] ?? '').filter(Boolean).join(' ');
}

/**
 * 首页 Diagnosis 卡 —— 真实 Diagnosis（GET /api/diagnosis/demo-user-001）。
 * 展示 primary_focus（当前最值得关注）、状态、掌握度、reasonCodes 确定性中文解释。
 * 不展示工程 priority_score，可显示「优先巩固」。
 */
export function HomeDiagnosisCard() {
  const { data, loading, error, refetch } = useDiagnosis(
    DEMO_LEARNER_ID,
    DEMO_COURSE_ID
  );

  const primary = data?.primaryFocus ?? null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <Focus className="h-4 w-4 text-orange-500" />
        <h2 className="text-lg font-bold text-gray-900">当前最值得关注</h2>
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 py-6 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">正在分析你的学习重点…</span>
        </div>
      )}

      {error && (
        <div className="mt-4 flex flex-col items-start gap-3 py-4">
          <div className="flex items-center gap-2 text-gray-500">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">暂时无法读取学习诊断</span>
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

      {data && !primary && (
        <p className="mt-4 text-sm text-gray-500">
          当前没有需要优先干预的薄弱点，整体掌握情况较好。
        </p>
      )}

      {data && primary && (
        <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-900">
              {primary.knowledgePointName}
            </span>
            <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              {DIAGNOSIS_STATUS_LABEL[primary.status]}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-5">
            <div>
              <p className="text-xs text-gray-400">掌握度</p>
              <p className="text-lg font-bold text-gray-900">
                {pct(primary.masteryScore)}
              </p>
            </div>
            <div className="flex-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
                <div
                  className="h-full rounded-full bg-orange-400"
                  style={{ width: `${primary.masteryScore * 100}%` }}
                />
              </div>
              <p
                className={cn(
                  'mt-2 text-xs',
                  primary.status === 'weak'
                    ? 'text-orange-600'
                    : 'text-gray-500'
                )}
              >
                {primary.status === 'weak' ? '优先巩固' : '建议关注'} ·{' '}
                {reasonText(primary.reasonCodes)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
