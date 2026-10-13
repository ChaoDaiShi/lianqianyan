import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Compass, Lightbulb, RotateCw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { LearningState } from '@/components/feedback/LearningState';
import { CurriculumMasteryMatrix } from '@/components/diagnosis/CurriculumMasteryMatrix';
import { EvidenceDrawer } from '@/components/diagnosis/EvidenceDrawer';
import { CompanionPanel } from '@/components/xiaolian/CompanionPanel';
import { buildDiagnosisAdvice, formatDiagnosisPercent } from '@/components/diagnosis/diagnosisPresentation';
import { Button } from '@/components/ui/button';
import { fetchDiagnosis, fetchKnowledgeGraph, fetchLearnerProfile, type KnowledgeGraphData } from '@/lib/educationApi';
import type { DiagnosisResult, KnowledgePointDiagnosis, LearnerProfile } from '@/domain';
import { useCurrentPlan, useRecentEvidence } from '@/lib/hooks';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';
import { LeapObservationPanel } from '@/components/adaptive/LeapObservationPanel';

const COURSE_ID = ACTIVE_COURSE_ID;
type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; profile: LearnerProfile; diagnosis: DiagnosisResult };

export default function DiagnosisPage() {
  const [view, setView] = useState<ViewState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [graph, setGraph] = useState<KnowledgeGraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState(false);
  const evidence = useRecentEvidence();
  const currentPlan = useCurrentPlan(ACTIVE_LEARNER_ID, COURSE_ID);

  const load = () => {
    setView({ status: 'loading' });
    return Promise.all([
      fetchLearnerProfile(ACTIVE_LEARNER_ID, COURSE_ID),
      fetchDiagnosis(ACTIVE_LEARNER_ID, COURSE_ID),
    ]).then(([profile, diagnosis]) => {
      if (!profile.totalKnowledgePoints) setView({ status: 'empty' });
      else setView({ status: 'ready', profile, diagnosis });
    }).catch(() => setView({ status: 'error', message: '暂时无法生成学习诊断，请稍后再试。' }));
  };

  const loadGraph = useCallback(async () => {
    setGraphLoading(true);
    setGraphError(false);
    try {
      setGraph(await fetchKnowledgeGraph(COURSE_ID));
    } catch {
      setGraph(null);
      setGraphError(true);
    } finally {
      setGraphLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setView({ status: 'loading' });
    Promise.all([
      fetchLearnerProfile(ACTIVE_LEARNER_ID, COURSE_ID),
      fetchDiagnosis(ACTIVE_LEARNER_ID, COURSE_ID),
    ]).then(([profile, diagnosis]) => {
      if (cancelled) return;
      if (!profile.totalKnowledgePoints) setView({ status: 'empty' });
      else setView({ status: 'ready', profile, diagnosis });
    }).catch(() => {
      if (!cancelled) setView({ status: 'error', message: '暂时无法生成学习诊断，请稍后再试。' });
    });
    void loadGraph();
    return () => { cancelled = true; };
  }, [loadGraph]);

  const ready = view.status === 'ready' ? view : null;
  const focus = ready?.diagnosis.primaryFocus ?? null;
  const selectedPoint = ready?.profile.knowledgePoints.find(
    (point) => point.knowledgePointId === selectedId,
  ) ?? null;
  const scopedEvidence = (evidence.data ?? []).filter(
    (item) => item.learnerId === ACTIVE_LEARNER_ID && item.courseId === COURSE_ID,
  );
  const companion = (
    <CompanionPanel
      state={view.status === 'loading' ? 'analyzing' : focus ? 'encourage' : 'idle'}
      eyebrow={view.status === 'loading' ? '小涟正在分析' : focus ? '小涟发现' : '小涟说明'}
      title={focus ? `优先关注「${focus.knowledgePointName}」` : '诊断只依据真实证据'}
      message={view.status === 'error'
        ? '画像与诊断没有成功加载，因此不展示模拟结论。'
        : focus
          ? buildDiagnosisAdvice(ready!.diagnosis)[0] ?? '当前诊断已形成。'
          : '没有足够证据时，我会保持未知，而不是把它当作薄弱。'}
      details={ready && (
        <div className="space-y-2 text-sm text-[var(--em-muted-ink)]">
          <p>覆盖：{ready.profile.assessedCount}/{ready.profile.totalKnowledgePoints} 个知识点</p>
          <p>综合掌握：{ready.profile.insufficientData ? '数据不足' : formatDiagnosisPercent(ready.profile.overallMastery, true)}</p>
        </div>
      )}
    />
  );

  const reload = () => {
    void load();
    void loadGraph();
    void evidence.refetch();
    void currentPlan.refetch();
  };

  return (
    <AppShell companion={companion}>
      <div className="mx-auto max-w-6xl space-y-5">
        <header>
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--em-primary)]">
            <Compass className="h-4 w-4" />LEARNING OBSERVATION
          </p>
          <h1 className="mt-1 text-2xl font-bold">学习观察空间</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--em-muted-ink)]">
            按课程知识目录查看掌握状态和近期证据；没有作答证据的部分保持未知。
          </p>
        </header>

        <LeapObservationPanel learnerId={ACTIVE_LEARNER_ID} courseId={ACTIVE_COURSE_ID} />

        {view.status === 'loading' && (
          <LearningState kind="loading" title="正在读取学习画像" description="正在读取当前课程的画像与诊断证据…" />
        )}
        {view.status === 'error' && (
          <LearningState
            kind="error"
            title={view.message}
            description="真实数据没有加载成功，因此不会显示模拟学习状态。"
            action={<Button variant="outline" onClick={reload} className="gap-2"><RotateCw className="h-4 w-4" />重新加载</Button>}
          />
        )}
        {view.status === 'empty' && (
          <LearningState kind="empty" title="还没有足够学习证据" description="完成一次学习或快速练习后，课程目录会逐步显示实际诊断状态。" />
        )}

        {ready && (
          <>
            <div className="grid gap-3 sm:grid-cols-[1.2fr_repeat(3,minmax(0,.7fr))]">
              <div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4">
                <p className="flex items-center gap-2 text-sm text-[var(--em-muted-ink)]"><CheckCircle2 className="h-4 w-4 text-green-700" />当前课程</p>
                <p className="mt-2 font-semibold">{ready.profile.courseName}</p>
              </div>
              <div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4">
                <p className="text-sm text-[var(--em-muted-ink)]">已观察</p>
                <p className="mt-2 text-xl font-bold">{ready.profile.assessedCount}/{ready.profile.totalKnowledgePoints}</p>
              </div>
              <div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4">
                <p className="text-sm text-[var(--em-muted-ink)]">熟练 / 掌握</p>
                <p className="mt-2 text-xl font-bold">{ready.profile.statusCounts.proficient} / {ready.profile.statusCounts.mastered}</p>
              </div>
              <div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-4">
                <p className="text-sm text-[var(--em-muted-ink)]">未知 / 证据不足</p>
                <p className="mt-2 text-xl font-bold">{ready.profile.statusCounts.unassessed} / {ready.profile.statusCounts.insufficient_evidence}</p>
              </div>
            </div>

            {focus && (
              <GlassPanel className="p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-800">
                    <Lightbulb className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">当前优先关注 · {focus.knowledgePointName}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">{buildDiagnosisAdvice(ready.diagnosis)[0]}</p>
                  </div>
                </div>
              </GlassPanel>
            )}

            <GlassPanel className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[var(--em-primary)]" /><h2 className="text-lg font-semibold">课程知识能力矩阵</h2></div>
                  <p className="mt-1 text-sm leading-6 text-[var(--em-muted-ink)]">
                    点选知识点查看真实事件流水、评分解释和当前路线关系；未知不等于薄弱。
                  </p>
                </div>
                {graphLoading && <span className="text-xs text-[var(--em-muted-ink)]">正在读取课程章节…</span>}
                {!graphLoading && graphError && <span className="text-xs text-[var(--em-muted-ink)]">章节目录暂不可用，仍显示画像中的知识点。</span>}
              </div>
              <div className="mt-5">
                <CurriculumMasteryMatrix
                  points={ready.profile.knowledgePoints}
                  graph={graph}
                  primaryFocusId={ready.diagnosis.primaryFocus?.knowledgePointId ?? null}
                  selectedId={selectedId}
                  onSelect={(point: KnowledgePointDiagnosis) => setSelectedId(point.knowledgePointId)}
                />
              </div>
            </GlassPanel>

            {selectedPoint && (
              <EvidenceDrawer
                point={selectedPoint}
                events={scopedEvidence}
                loading={evidence.loading}
                error={evidence.error}
                planTask={currentPlan.plan?.tasks.find(
                  (task) => task.knowledgePointId === selectedPoint.knowledgePointId,
                ) ?? null}
                inCurrentPlan={currentPlan.loading || currentPlan.error
                  ? null
                  : Boolean(currentPlan.plan?.tasks.some(
                    (task) => task.knowledgePointId === selectedPoint.knowledgePointId,
                  ))}
                planLoading={currentPlan.loading}
                planError={currentPlan.error}
                onClose={() => setSelectedId(null)}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
