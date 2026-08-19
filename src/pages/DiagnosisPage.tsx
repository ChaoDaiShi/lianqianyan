import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Stethoscope,
  Lightbulb,
  AlertTriangle,
  Loader2,
  Target,
  CheckCircle2,
  Circle,
  ShieldAlert,
} from 'lucide-react';
import {
  fetchDiagnosis,
  fetchLearnerProfile,
} from '@/lib/educationApi';
import type {
  DiagnosisResult,
  DiagnosisReasonCode,
  DiagnosisStatus,
  KnowledgePointDiagnosis,
  LearnerProfile,
} from '@/domain';
import {
  DIAGNOSIS_REASON_TEXT,
  DIAGNOSIS_STATUS_LABEL,
} from '@/domain';
import { DEMO_LEARNER_ID } from '@/store';
import { cn } from '@/lib/utils';

const COURSE_ID = 'course-os';

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; profile: LearnerProfile; diagnosis: DiagnosisResult };

/** 状态 → 展示颜色。 */
const statusTone: Record<
  DiagnosisStatus,
  { badge: string; bar: string; text: string }
> = {
  mastered: { badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  proficient: { badge: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-400', text: 'text-emerald-600' },
  developing: { badge: 'bg-blue-50 text-blue-700', bar: 'bg-blue-500', text: 'text-blue-700' },
  weak: { badge: 'bg-orange-50 text-orange-700', bar: 'bg-orange-400', text: 'text-orange-700' },
  insufficient_evidence: { badge: 'bg-gray-100 text-gray-500', bar: 'bg-gray-300', text: 'text-gray-500' },
  unassessed: { badge: 'bg-gray-100 text-gray-500', bar: 'bg-gray-300', text: 'text-gray-500' },
};

const isAssessed = (s: DiagnosisStatus) =>
  s === 'weak' || s === 'developing' || s === 'proficient' || s === 'mastered';

function pct(value: number | null | undefined): string {
  if (value == null) return '暂无足够数据';
  return `${Math.round(value * 100)}%`;
}

/** 由 reason_codes 生成的小涟建议文案。 */
function buildAdvice(diagnosis: DiagnosisResult): string[] {
  const lines: string[] = [];
  const primary = diagnosis.primaryFocus;
  if (primary) {
    lines.push(
      `目前「${primary.knowledgePointName}」是最值得优先巩固的知识点。你已经积累了足够学习证据，因此这个判断具有一定可信度。`
    );
  }
  if (diagnosis.unassessedPoints.length > 0) {
    lines.push(
      `目前还有较多知识点尚未完成有效评估。相比直接安排大量学习，先完成一次快速测评会更合适。`
    );
  } else if (!primary && diagnosis.strengths.length > 0) {
    lines.push(
      `当前没有需要优先干预的薄弱点，说明整体掌握情况较好，可以继续推进新的学习内容。`
    );
  }
  if (lines.length === 0) {
    lines.push(`当前还没有足够学习证据。完成一次学习或快速练习后，小涟会逐步了解你的学习状态。`);
  }
  return lines;
}

function reasonLines(p: KnowledgePointDiagnosis): string[] {
  if (p.reasonCodes.length === 0) {
    return [DIAGNOSIS_REASON_TEXT[p.status === 'unassessed' ? 'NO_EVIDENCE' : 'LIMITED_EVIDENCE']];
  }
  return p.reasonCodes.map(
    (c: DiagnosisReasonCode) => DIAGNOSIS_REASON_TEXT[c] ?? ''
  );
}

/** 顶部学习状态概览。 */
function Overview({ profile }: { profile: LearnerProfile }) {
  const items = [
    {
      label: '综合掌握度',
      value: profile.insufficientData ? '暂无足够数据' : pct(profile.overallMastery),
      hint: profile.insufficientData ? '需要更多评估' : '仅统计已有足够证据的知识点',
    },
    {
      label: '画像可信度',
      value: pct(profile.overallConfidence),
      hint: '覆盖度 × 平均置信',
    },
    {
      label: '诊断覆盖',
      value: `${Math.round(profile.coverage * 100)}%`,
      hint: `${profile.assessedCount} / ${profile.totalKnowledgePoints} 个知识点已评估`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <p className="text-xs text-gray-400">{it.label}</p>
          <p
            className={cn(
              'mt-2 text-2xl font-bold',
              profile.insufficientData && it.label === '综合掌握度'
                ? 'text-gray-400'
                : 'text-gray-900'
            )}
          >
            {it.value}
          </p>
          <p className="mt-1 text-xs text-gray-400">{it.hint}</p>
        </div>
      ))}
    </div>
  );
}

/** 重点关注 —— 来自真实 primary_focus。 */
function FocusCard({ diagnosis }: { diagnosis: DiagnosisResult }) {
  const primary = diagnosis.primaryFocus;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-orange-500" />
        <h2 className="text-lg font-bold text-gray-900">当前最值得优先关注</h2>
      </div>
      {primary ? (
        <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">{primary.knowledgePointName}</span>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              优先关注
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {reasonLines(primary).map((line) => (
              <p key={line} className="text-sm text-gray-600">
                {line}
              </p>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            已评估 {primary.evidenceCount} 次 · 掌握度 {pct(primary.masteryScore)} · 可信度{' '}
            {pct(primary.confidence)}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-500">
          当前没有足够可靠需要优先干预的薄弱点，可以继续推进新的学习内容。
        </p>
      )}
    </div>
  );
}

/** 知识点诊断列表。 */
function KnowledgeList({ points }: { points: KnowledgePointDiagnosis[] }) {
  const list = [...points].sort((a, b) => {
    const order: Record<DiagnosisStatus, number> = {
      weak: 0,
      developing: 1,
      proficient: 2,
      mastered: 3,
      insufficient_evidence: 4,
      unassessed: 5,
    };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-4 w-4 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-900">知识点诊断列表</h2>
      </div>
      <div className="mt-4 space-y-3">
        {list.map((p) => {
          const tone = statusTone[p.status];
          const assessed = isAssessed(p.status);
          return (
            <div
              key={p.knowledgePointId}
              className="flex flex-col gap-2 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-gray-900">
                    {p.knowledgePointName}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                      tone.badge
                    )}
                  >
                    {DIAGNOSIS_STATUS_LABEL[p.status]}
                  </span>
                </div>
                {!assessed && (
                  <p className="mt-1 text-xs text-gray-400">
                    {reasonLines(p).join(' ')}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  有效评价证据 {p.evidenceCount} 条
                </p>
              </div>

              <div className="flex w-full items-center gap-3 sm:w-auto sm:min-w-[240px]">
                {assessed ? (
                  <>
                    <div className="flex-1 sm:w-32">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn('h-full rounded-full', tone.bar)}
                          style={{ width: `${p.masteryScore * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-14 text-right">
                      <p className={cn('text-sm font-bold', tone.text)}>
                        {pct(p.masteryScore)}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        可信 {pct(p.confidence)}
                      </p>
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-gray-400">--</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 尚未评估 / 证据不足 —— 不把未知误判为薄弱。 */
function UnassessedCard({ points }: { points: KnowledgePointDiagnosis[] }) {
  if (points.length === 0) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-gray-400" />
        <h2 className="text-lg font-bold text-gray-900">还不了解的部分</h2>
      </div>
      <p className="mt-1 text-sm text-gray-400">
        尚未完成有效评估，不代表掌握薄弱，只是暂时没有足够证据判断。
      </p>
      <div className="mt-4 space-y-2">
        {points.map((p) => (
          <div
            key={p.knowledgePointId}
            className="flex items-center justify-between rounded-xl bg-gray-50/70 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-700">{p.knowledgePointName}</p>
              <p className="text-xs text-gray-400">
                {DIAGNOSIS_STATUS_LABEL[p.status]} · 建议完成一次快速诊断
              </p>
            </div>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                statusTone[p.status].badge
              )}
            >
              {DIAGNOSIS_STATUS_LABEL[p.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 小涟建议。 */
function AdviceCard({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6">
      <div className="flex items-center gap-2 text-blue-700">
        <Lightbulb className="h-4 w-4" />
        <h2 className="text-lg font-bold">小涟建议</h2>
      </div>
      <div className="mt-3 space-y-2">
        {lines.map((line) => (
          <p key={line} className="text-sm leading-relaxed text-gray-700">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
      <Circle className="mx-auto h-10 w-10 text-gray-300" />
      <h2 className="mt-4 text-lg font-bold text-gray-900">还没有足够学习证据</h2>
      <p className="mt-2 text-sm text-gray-500">
        完成一次学习或快速练习后，小涟会逐步了解你的学习状态。
      </p>
    </div>
  );
}

/**
 * 学习诊断页 —— 由真实 Education API（LearnerProfile + Diagnosis）驱动。
 * 不伪造数据；API 失败时展示错误状态，不偷偷回退到 Mock。
 */
export default function DiagnosisPage() {
  const [view, setView] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setView({ status: 'loading' });
    Promise.all([
      fetchLearnerProfile(DEMO_LEARNER_ID, COURSE_ID),
      fetchDiagnosis(DEMO_LEARNER_ID, COURSE_ID),
    ])
      .then(([profile, diagnosis]) => {
        if (cancelled) return;
        if (profile.totalKnowledgePoints === 0) {
          setView({ status: 'empty' });
          return;
        }
        setView({ status: 'ready', profile, diagnosis });
      })
      .catch(() => {
        if (!cancelled) {
          setView({
            status: 'error',
            message: '暂时无法生成学习诊断，请稍后再试。',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-[26px]">
          学习诊断
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          基于真实学习证据与掌握度模型，判断你目前的理解状态。
        </p>
      </div>

      {view.status === 'loading' && (
        <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>正在生成学习诊断…</span>
        </div>
      )}

      {view.status === 'error' && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white py-16 text-gray-500">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span>{view.message}</span>
        </div>
      )}

      {view.status === 'empty' && <EmptyState />}

      {view.status === 'ready' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {view.profile.courseName}
            {view.profile.insufficientData && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
                数据尚不充足
              </span>
            )}
          </div>

          <Overview profile={view.profile} />
          <FocusCard diagnosis={view.diagnosis} />
          <KnowledgeList points={view.profile.knowledgePoints} />
          <UnassessedCard points={view.diagnosis.unassessedPoints} />
          <AdviceCard lines={buildAdvice(view.diagnosis)} />
        </div>
      )}
    </AppShell>
  );
}
