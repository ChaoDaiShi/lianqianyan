import { BookOpen, CalendarClock, FolderOpen, RotateCw, Sparkles, Target } from 'lucide-react';
import { LearningIdentityCard } from '@/components/archive/LearningIdentityCard';
import { LearningStoryTimeline } from '@/components/archive/LearningStoryTimeline';
import { formatDiagnosisPercent, getDiagnosisTone, isAssessedDiagnosis } from '@/components/diagnosis/diagnosisPresentation';
import { GlassPanel } from '@/components/design/GlassPanel';
import { GrowthMetric } from '@/components/design/GrowthMetric';
import { LearningState } from '@/components/feedback/LearningState';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { MemoryCapsule } from '@/components/xiaolian/MemoryCapsule';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { XiaolianLearningPortrait } from '@/components/xiaolian/XiaolianLearningPortrait';
import { XiaolianMemoryCard } from '@/components/xiaolian/XiaolianMemoryCard';
import { ACTION_TYPE_LABEL, DIAGNOSIS_REASON_TEXT, DIAGNOSIS_STATUS_LABEL } from '@/domain';
import type { KnowledgePointDiagnosis } from '@/domain';
import { useCurrentPlan, useDiagnosis, useLearnerProfile, useRecentEvidence } from '@/lib/hooks';
import { DEMO_COURSE_ID, DEMO_LEARNER_ID, useLearningLoopStore } from '@/store';

const SORT_ORDER: Record<string, number> = {
  weak: 0,
  developing: 1,
  proficient: 2,
  mastered: 3,
  insufficient_evidence: 4,
  unassessed: 5,
};

function KnowledgeMemory({ point }: { point: KnowledgePointDiagnosis }) {
  const assessed = isAssessedDiagnosis(point.status);
  const tone = getDiagnosisTone(point.status);

  return (
    <div className="rounded-[18px] border border-violet-100 bg-white/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-sm">{point.knowledgePointName}</strong>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.badge}`}>
          {DIAGNOSIS_STATUS_LABEL[point.status]}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-50">
        <div
          className={`h-full rounded-full ${tone.node}`}
          style={{ width: assessed ? `${Math.min(100, point.masteryScore * 100)}%` : '8%' }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--em-muted-ink)]">
        {assessed
          ? `掌握度 ${formatDiagnosisPercent(point.masteryScore, true)} · ${point.evidenceCount} 条证据`
          : '尚未评估，不代表薄弱'}
      </p>
    </div>
  );
}

export function ArchivePage() {
  const profile = useLearnerProfile(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const diagnosis = useDiagnosis(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const plan = useCurrentPlan(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const evidence = useRecentEvidence();
  const practiceEvaluationsByTask = useLearningLoopStore((state) => state.practiceEvaluations);
  const reflectionResultsByTask = useLearningLoopStore((state) => state.reflectionResults);

  const reloadAll = () => {
    void profile.refetch();
    void diagnosis.refetch();
    void plan.refetch();
    void evidence.refetch();
  };
  const sorted = [...(profile.data?.knowledgePoints ?? [])].sort(
    (a, b) => (SORT_ORDER[a.status] ?? 9) - (SORT_ORDER[b.status] ?? 9)
  );
  const knowledgeNames = Object.fromEntries(
    (profile.data?.knowledgePoints ?? []).map((point) => [point.knowledgePointId, point.knowledgePointName])
  );
  const primary = diagnosis.data?.primaryFocus ?? null;
  const reflectionResults = Object.entries(reflectionResultsByTask)
    .filter(
      ([taskId, result]) =>
        result.taskId === taskId &&
        result.learnerId === DEMO_LEARNER_ID &&
        result.courseId === DEMO_COURSE_ID,
    )
    .map(([, result]) => result);

  return (
    <AppShell>
      <div className="space-y-6">
        <GlassPanel className="relative overflow-hidden p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-pink-200/25 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold text-primary-700">
                <FolderOpen className="h-4 w-4" />
                GROWTH MEMORIES
              </p>
              <h1 className="mt-2 text-3xl font-bold">成长记忆</h1>
              <p className="mt-2 text-sm text-[var(--em-muted-ink)]">
                学习画像、诊断、当前计划和真实行为证据汇聚成你的成长轨迹。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <XiaolianCharacter state="success" size="md" />
              {!profile.loading && (
                <Button variant="outline" size="sm" onClick={reloadAll} className="gap-2 rounded-xl">
                  <RotateCw className="h-3.5 w-3.5" />
                  刷新记忆
                </Button>
              )}
            </div>
          </div>
        </GlassPanel>

        {profile.loading && !profile.data && <LearningState kind="loading" title="正在读取学习画像" />}
        {profile.error && !profile.data && (
          <LearningState
            kind="error"
            title="暂时无法读取学习画像"
            action={
              <Button variant="outline" onClick={() => void profile.refetch()} className="gap-2">
                <RotateCw className="h-4 w-4" />
                重新加载
              </Button>
            }
          />
        )}

        {profile.data && (
          <>
            {diagnosis.loading && !diagnosis.data && <LearningState kind="loading" title="正在读取学习诊断" />}
            {diagnosis.error && !diagnosis.data && (
              <LearningState
                kind="error"
                title="学习诊断暂时无法读取"
                description="学习画像与其他成长记录仍可继续查看。"
                action={
                  <Button variant="outline" onClick={() => void diagnosis.refetch()} className="gap-2">
                    <RotateCw className="h-4 w-4" />
                    重新加载诊断
                  </Button>
                }
              />
            )}
            {diagnosis.data && <LearningIdentityCard profile={profile.data} diagnosis={diagnosis.data} />}
            {diagnosis.data && (
              <div className="grid gap-6 lg:grid-cols-2">
                <XiaolianLearningPortrait
                  profile={profile.data}
                  diagnosis={diagnosis.data}
                />
                <XiaolianMemoryCard
                  profile={profile.data}
                  diagnosis={diagnosis.data}
                  evidence={evidence.data ?? []}
                  reflectionResults={reflectionResults}
                  learnerId={DEMO_LEARNER_ID}
                  courseId={DEMO_COURSE_ID}
                />
              </div>
            )}
            <MemoryCapsule confirmedPreferences={[]} />

            <GlassPanel className="p-5 sm:p-6">
              <p className="text-xs text-[var(--em-muted-ink)]">当前课程</p>
              <h2 className="mt-1 text-xl font-bold">{profile.data.courseName}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <GrowthMetric
                  label="综合掌握度"
                  value={profile.data.insufficientData ? '暂无足够数据' : formatDiagnosisPercent(profile.data.overallMastery, true)}
                />
                <GrowthMetric
                  label="画像可信度"
                  value={formatDiagnosisPercent(profile.data.overallConfidence, true)}
                  tone="star"
                />
                <GrowthMetric
                  label="诊断覆盖率"
                  value={`${Math.round(profile.data.coverage * 100)}%`}
                  hint={`${profile.data.assessedCount}/${profile.data.totalKnowledgePoints} 个知识点`}
                  tone="accent"
                />
              </div>
            </GlassPanel>

            {primary && (
              <GlassPanel className="p-6">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-companion" />
                  <h2 className="text-lg font-bold">此刻最值得记住</h2>
                </div>
                <div className="mt-4 rounded-[20px] bg-gradient-to-r from-pink-50 to-violet-50 p-5">
                  <strong>{primary.knowledgePointName}</strong>
                  <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-xs text-fuchsia-700">
                    {DIAGNOSIS_STATUS_LABEL[primary.status]}
                  </span>
                  <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">
                    掌握度 {formatDiagnosisPercent(primary.masteryScore, true)} ·{' '}
                    {primary.reasonCodes.map((code) => DIAGNOSIS_REASON_TEXT[code] ?? '').filter(Boolean).join(' ')}
                  </p>
                </div>
              </GlassPanel>
            )}

            <GlassPanel className="p-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-star" />
                <h2 className="text-lg font-bold">知识星点</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sorted.map((point) => <KnowledgeMemory key={point.knowledgePointId} point={point} />)}
              </div>
              {sorted.length === 0 && (
                <p className="mt-4 text-sm text-[var(--em-muted-ink)]">
                  暂无可展示的知识点。
                </p>
              )}
            </GlassPanel>
          </>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel className="p-6">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary-500" />
              <h2 className="text-lg font-bold">当前星轨</h2>
            </div>
            <div className="mt-4 space-y-2">
              {plan.loading && !plan.plan && <p className="text-sm text-[var(--em-muted-ink)]">正在读取当前学习计划…</p>}
              {!plan.loading && plan.error && !plan.plan && (
                <div>
                  <p className="text-sm text-amber-700">当前学习计划暂时无法读取。</p>
                  <Button variant="outline" size="sm" onClick={() => void plan.refetch()} className="mt-3 gap-2">
                    <RotateCw className="h-3.5 w-3.5" />
                    重新加载计划
                  </Button>
                </div>
              )}
              {plan.plan?.tasks.length
                ? plan.plan.tasks.map((task, index) => (
                    <div key={task.id} className="flex items-center gap-3 rounded-[18px] bg-white/50 p-3">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-xs font-bold text-primary-700">
                        {index + 1}
                      </span>
                      <p className="min-w-0 flex-1 text-sm font-semibold">{task.knowledgePointName}</p>
                      <span className="text-xs text-[var(--em-muted-ink)]">
                        {ACTION_TYPE_LABEL[task.actionType]} · {task.estimatedMinutes}min
                      </span>
                    </div>
                  ))
                : !plan.loading && !plan.error && (
                    <p className="text-sm text-[var(--em-muted-ink)]">尚未生成学习计划。</p>
                  )}
            </div>
          </GlassPanel>

          <LearningStoryTimeline
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
        </div>

        <p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]">
          <Sparkles className="h-3.5 w-3.5 text-companion" />
          小涟的观察由真实学习画像、诊断、复述结果、当前计划与最近学习行为共同构成。
        </p>
      </div>
    </AppShell>
  );
}
