import {
  FolderOpen,
  Loader2,
  AlertTriangle,
  Target,
  BookOpen,
  CalendarClock,
  RotateCw,
} from 'lucide-react';
import { LearningJourneyTimeline } from '@/components/archive/LearningJourneyTimeline';
import { AppShell } from '@/components/layout/AppShell';
import {
  useLearnerProfile,
  useDiagnosis,
  useCurrentPlan,
  useRecentEvidence,
} from '@/lib/hooks';
import { DEMO_LEARNER_ID, DEMO_COURSE_ID, useLearningLoopStore } from '@/store';
import {
  DIAGNOSIS_STATUS_LABEL,
  DIAGNOSIS_REASON_TEXT,
  ACTION_TYPE_LABEL,
} from '@/domain';
import type { KnowledgePointDiagnosis } from '@/domain';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function pct(value: number | null): string {
  if (value == null) return '--';
  return `${Math.round(value * 100)}%`;
}

const REASON_MAP: Record<string, string> = {
  NO_EVIDENCE: '尚未完成有效评估。',
  LIMITED_EVIDENCE: '有效练习记录较少，判断可信度有限。',
  LOW_MASTERY: '当前掌握度偏低。',
  ADEQUATE_MASTERY: '当前掌握情况尚可。',
  STRONG_MASTERY: '当前掌握情况良好。',
};

const SORT_ORDER: Record<string, number> = {
  weak: 0,
  developing: 1,
  proficient: 2,
  mastered: 3,
  insufficient_evidence: 4,
  unassessed: 5,
};

function statusBarClass(status: string): string {
  switch (status) {
    case 'mastered':
      return 'bg-emerald-500';
    case 'proficient':
      return 'bg-emerald-400';
    case 'developing':
      return 'bg-blue-500';
    case 'weak':
      return 'bg-orange-400';
    default:
      return 'bg-gray-300';
  }
}

/**
 * 学习报告 / 学习档案 —— /#/archive（Phase 3-1 升级为 Current Plan 语义）。
 *
 * 数据全部真实：LearnerProfile + Diagnosis + Current StudyPlan + Recent Evidence。
 * 知识点状态分布用横向条展示（不引入 ECharts）。
 */
export function ArchivePage() {
  const profile = useLearnerProfile(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const diagnosis = useDiagnosis(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const plan = useCurrentPlan(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const evidence = useRecentEvidence();
  const practiceEvaluationsByTask = useLearningLoopStore((state) => state.practiceEvaluations);

  const reloadAll = () => {
    profile.refetch();
    diagnosis.refetch();
    plan.refetch();
    evidence.refetch();
  };

  const loading =
    plan.loading || (profile.loading && plan.summary == null);
  const error =
    (!plan.loading && plan.error && !plan.summary && !profile.error) ||
    (profile.error && diagnosis.error && !profile.data);

  const kps: KnowledgePointDiagnosis[] = profile.data?.knowledgePoints ?? [];
  const sorted = [...kps].sort(
    (a, b) => (SORT_ORDER[a.status] ?? 9) - (SORT_ORDER[b.status] ?? 9)
  );
  const knowledgeNames = Object.fromEntries(
    kps.map((point) => [point.knowledgePointId, point.knowledgePointName])
  );
  const primary = diagnosis.data?.primaryFocus ?? null;

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <FolderOpen className="h-4 w-4" />
            <span>学习档案</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 md:text-[26px]">
            学习报告
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            汇总当前学习画像、诊断、计划与近期学习行为。
          </p>
        </div>
        {!loading && !error && (
          <Button variant="outline" size="sm" onClick={reloadAll} className="gap-1.5 shrink-0">
            <RotateCw className="h-3.5 w-3.5" />
            刷新数据
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>正在生成学习报告…</span>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-gray-100 bg-white p-8">
          <div className="flex items-center gap-2 text-gray-500">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>暂时无法读取学习状态</span>
          </div>
          <Button variant="outline" onClick={reloadAll} className="gap-1.5">
            <RotateCw className="h-4 w-4" />
            重新加载
          </Button>
        </div>
      )}

      {!loading && !error && profile.data && (
        <div className="space-y-6">
          {/* 概览 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-xs text-gray-400">当前课程</p>
            <p className="mt-0.5 text-lg font-bold text-gray-900">{profile.data.courseName}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Metric
                label="综合掌握度"
                value={
                  profile.data.insufficientData || profile.data.overallMastery == null
                    ? '暂无足够数据'
                    : pct(profile.data.overallMastery)
                }
              />
              <Metric
                label="画像可信度"
                value={pct(profile.data.overallConfidence)}
              />
              <Metric
                label="诊断覆盖率"
                value={pct(profile.data.coverage)}
                hint={`${profile.data.assessedCount} / ${profile.data.totalKnowledgePoints} 个知识点`}
              />
            </div>
          </div>

          {/* 重点关注 */}
          {primary && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-6">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-500" />
                <h2 className="text-lg font-bold text-gray-900">重点关注</h2>
              </div>
              <div className="mt-3">
                <span className="font-semibold text-gray-900">{primary.knowledgePointName}</span>
                <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                  {DIAGNOSIS_STATUS_LABEL[primary.status]}
                </span>
                <p className="mt-1 text-sm text-gray-600">
                  掌握度 {pct(primary.masteryScore)} ·{' '}
                  {primary.reasonCodes.length > 0
                    ? primary.reasonCodes
                        .map((c) => REASON_MAP[c] ?? DIAGNOSIS_REASON_TEXT[c] ?? '')
                        .filter(Boolean)
                        .join(' ')
                    : '当前掌握度偏低，建议优先补强。'}
                </p>
              </div>
            </div>
          )}

          {/* 最新计划 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">当前计划</h2>
            </div>
            {plan.plan && plan.plan.tasks.length > 0 ? (
              <div className="mt-4 space-y-2">
                {plan.plan.tasks.map((task, index) => (
                  <div key={task.id} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-xs font-bold text-blue-700">
                      {index + 1}
                    </span>
                    <p className="flex-1 text-sm text-gray-800">{task.knowledgePointName}</p>
                    <span className="text-xs text-gray-400">
                      {ACTION_TYPE_LABEL[task.actionType]} · {task.estimatedMinutes}min
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">尚未生成学习计划。</p>
            )}
          </div>

          {/* 知识点状态分布 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">知识点状态分布</h2>
            </div>
            <div className="mt-4 space-y-3">
              {sorted.map((kp) => (
                <KnowledgeBar key={kp.knowledgePointId} kp={kp} />
              ))}
            </div>
          </div>

          <LearningJourneyTimeline
            evidence={evidence.data ?? []}
            plan={plan.plan}
            practiceEvaluations={Object.values(practiceEvaluationsByTask)}
            knowledgeNames={knowledgeNames}
            learnerId={DEMO_LEARNER_ID}
            courseId={DEMO_COURSE_ID}
            loading={evidence.loading}
            error={evidence.error}
            onRetry={() => void evidence.refetch()}
          />

          <p className="text-[11px] text-gray-300">
            报告 = 学习画像 + 学习诊断 + 当前学习计划 + 最近学习行为 · 为后续重规划提供最新学习状态
          </p>
        </div>
      )}
    </AppShell>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p
        className={cn(
          'mt-1.5 text-xl font-bold tracking-tight',
          value === '暂无足够数据' || value === '--' ? 'text-gray-400' : 'text-blue-700'
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function KnowledgeBar({ kp }: { kp: KnowledgePointDiagnosis }) {
  const assessed =
    kp.status === 'weak' ||
    kp.status === 'developing' ||
    kp.status === 'proficient' ||
    kp.status === 'mastered';
  return (
    <div className="flex items-center gap-4">
      <span className="w-24 shrink-0 text-sm font-medium text-gray-700">
        {kp.knowledgePointName}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full', statusBarClass(kp.status))}
          style={{
            width: assessed ? `${Math.min(100, kp.masteryScore * 100)}%` : '4%',
          }}
        />
      </div>
      {assessed ? (
        <span className="w-14 shrink-0 text-right text-sm font-semibold text-gray-800">
          {pct(kp.masteryScore)}
        </span>
      ) : (
        <span className="w-14 shrink-0 text-right text-xs text-gray-400">尚未评估</span>
      )}
    </div>
  );
}
