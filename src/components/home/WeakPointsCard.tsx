import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Lightbulb, Loader2, RotateCw } from 'lucide-react';
import { fetchDiagnosis } from '@/lib/educationApi';
import type { DiagnosisResult, DiagnosisStatus, KnowledgePointDiagnosis } from '@/domain';
import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import { DEMO_LEARNER_ID } from '@/store';
import { cn } from '@/lib/utils';

type CardState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; diagnosis: DiagnosisResult };

const COURSE_ID = 'course-os';

const isAssessed = (s: DiagnosisStatus) =>
  s === 'weak' || s === 'developing' || s === 'proficient' || s === 'mastered';

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** 由结构化 Diagnosis 确定性生成首页建议，不调用 LLM。 */
function buildAdvice(diagnosis: DiagnosisResult): string | null {
  const primary = diagnosis.primaryFocus;
  if (primary) {
    return `建议优先巩固「${primary.knowledgePointName}」。当前掌握度 ${pct(
      primary.masteryScore
    )}。完成一次针对性学习与练习后，再观察掌握度变化。`;
  }
  if (diagnosis.unassessedPoints.length > 0) {
    return '目前还没有足够可靠的重点薄弱项。建议先完成更多基础评估，再决定优先学习方向。';
  }
  if (diagnosis.strengths.length > 0) {
    return '当前没有明显需要优先补强的知识点，可以继续按现有学习计划推进。';
  }
  return '当前学习证据还比较有限，完成一次学习或快速练习后，小涟会逐步了解你的状态。';
}

/**
 * 需要重点关注 —— 首页只消费真实 Diagnosis 结果。
 * API 失败时展示错误状态并允许重试，绝不偷偷回退到 Mock 薄弱点冒充真实诊断。
 */
export function WeakPointsCard() {
  const [state, setState] = useState<CardState>({ status: 'loading' });

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    fetchDiagnosis(DEMO_LEARNER_ID, COURSE_ID)
      .then((diagnosis) => setState({ status: 'ready', diagnosis }))
      .catch(() => setState({ status: 'error' }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetchDiagnosis(DEMO_LEARNER_ID, COURSE_ID)
      .then((diagnosis) => {
        if (!cancelled) setState({ status: 'ready', diagnosis });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const diagnosis = state.status === 'ready' ? state.diagnosis : null;
  const interventions = diagnosis ? diagnosis.priorityInterventions : [];
  const advice = diagnosis ? buildAdvice(diagnosis) : null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h2 className="text-lg font-bold text-gray-900">需要重点关注</h2>

      {state.status === 'loading' && (
        <div className="mt-4 flex items-center gap-2 py-6 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">正在整理你的学习重点…</span>
        </div>
      )}

      {state.status === 'error' && (
        <div className="mt-4 flex flex-col items-start gap-3 py-4">
          <div className="flex items-center gap-2 text-gray-500">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">暂时无法读取最新学习诊断</span>
          </div>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50"
          >
            <RotateCw className="h-3.5 w-3.5" />
            重新加载
          </button>
        </div>
      )}

      {state.status === 'ready' && interventions.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">
          当前没有需要优先干预的薄弱点，整体掌握情况较好。
        </p>
      )}

      {state.status === 'ready' && interventions.length > 0 && (
        <div className="mt-4 space-y-3">
          {interventions.slice(0, 3).map((p) => (
            <InterventionRow key={p.knowledgePointId} point={p} />
          ))}
        </div>
      )}

      {/* 小涟建议 */}
      {state.status === 'ready' && advice && (
        <div className="mt-5 rounded-xl bg-blue-50/70 p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <Lightbulb className="h-4 w-4" />
            <span className="text-sm font-semibold">小涟建议</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{advice}</p>
        </div>
      )}
    </div>
  );
}

function InterventionRow({ point }: { point: KnowledgePointDiagnosis }) {
  const assessed = isAssessed(point.status);
  const label = DIAGNOSIS_STATUS_LABEL[point.status];
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-700">{point.knowledgePointName}</span>
          <span
            className={cn(
              'rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600'
            )}
          >
            {assessed ? label : '尚未评估'}
          </span>
        </div>
        {assessed ? (
          <span className="shrink-0 font-semibold text-gray-900">{pct(point.masteryScore)}</span>
        ) : (
          <span className="shrink-0 font-semibold text-gray-400">--</span>
        )}
      </div>
      {assessed && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-amber-400"
            style={{ width: `${point.masteryScore * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
