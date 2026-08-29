import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Compass, Lightbulb, MessageCircle, Play, RotateCw, ShieldAlert, Target } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { LearningState } from '@/components/feedback/LearningState';
import { KnowledgeStarMap } from '@/components/diagnosis/KnowledgeStarMap';
import { CompanionPanel } from '@/components/xiaolian/CompanionPanel';
import { buildDiagnosisAdvice, diagnosisReasons, formatDiagnosisPercent, getDiagnosisTone, isAssessedDiagnosis } from '@/components/diagnosis/diagnosisPresentation';
import { Button } from '@/components/ui/button';
import { fetchDiagnosis, fetchLearnerProfile } from '@/lib/educationApi';
import type { DiagnosisResult, KnowledgePointDiagnosis, LearnerProfile } from '@/domain';
import { useCurrentPlan } from '@/lib/hooks';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';

const COURSE_ID = ACTIVE_COURSE_ID;
type ViewState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'empty' } | { status: 'ready'; profile: LearnerProfile; diagnosis: DiagnosisResult };

function PointInspector({ point, inCurrentPlan }: { point: KnowledgePointDiagnosis; inCurrentPlan: boolean }) {
  const tone = getDiagnosisTone(point.status);
  const assessed = isAssessedDiagnosis(point.status);
  return (
    <GlassPanel className="sticky top-5 p-5">
      <div className="flex items-center gap-2"><Target className="h-4 w-4 text-fuchsia-500" /><p className="text-xs font-semibold text-primary-700">知识点观察</p></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{point.knowledgePointName}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>{tone.label}</span></div>
      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-violet-50/55 p-3"><dt className="text-[10px] text-[var(--em-muted-ink)]">有效评价证据</dt><dd className="mt-1 text-lg font-bold">{point.evidenceCount} 条</dd></div>
        <div className="rounded-2xl bg-sky-50/55 p-3"><dt className="text-[10px] text-[var(--em-muted-ink)]">当前路线</dt><dd className="mt-1 text-sm font-bold">{inCurrentPlan ? '已安排' : '未安排'}</dd></div>
        {assessed && <><div className="rounded-2xl bg-white/55 p-3"><dt className="text-[10px] text-[var(--em-muted-ink)]">掌握度</dt><dd className="mt-1 text-lg font-bold">{formatDiagnosisPercent(point.masteryScore, true)}</dd></div><div className="rounded-2xl bg-white/55 p-3"><dt className="text-[10px] text-[var(--em-muted-ink)]">可信度</dt><dd className="mt-1 text-lg font-bold">{formatDiagnosisPercent(point.confidence, true)}</dd></div></>}
      </dl>
      <div className="mt-4 border-t border-violet-100 pt-4"><p className="text-xs font-semibold">为什么这样判断</p>{diagnosisReasons(point).map((reason) => <p key={reason} className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">{reason}</p>)}{!assessed && <p className="mt-2 text-xs leading-5 text-slate-500">未知不等于薄弱，因此这里不显示 0% 掌握度。</p>}</div>
      <div className="mt-5 grid grid-cols-2 gap-2"><Button asChild variant="outline" className="gap-2 rounded-xl"><a href="#/knowledge"><Play className="h-3.5 w-3.5" />去学习</a></Button><Button asChild variant="ghost" className="gap-2 rounded-xl"><a href="#/xiaolian"><MessageCircle className="h-3.5 w-3.5" />问小涟</a></Button></div>
    </GlassPanel>
  );
}

export default function DiagnosisPage() {
  const [view, setView] = useState<ViewState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const currentPlan = useCurrentPlan(ACTIVE_LEARNER_ID, COURSE_ID);
  const load = () => { setView({ status: 'loading' }); return Promise.all([fetchLearnerProfile(ACTIVE_LEARNER_ID, COURSE_ID), fetchDiagnosis(ACTIVE_LEARNER_ID, COURSE_ID)]).then(([profile, diagnosis]) => { if (!profile.totalKnowledgePoints) setView({ status: 'empty' }); else setView({ status: 'ready', profile, diagnosis }); }).catch(() => setView({ status: 'error', message: '暂时无法生成学习诊断，请稍后再试。' })); };
  useEffect(() => { let cancelled = false; setView({ status: 'loading' }); Promise.all([fetchLearnerProfile(ACTIVE_LEARNER_ID, COURSE_ID), fetchDiagnosis(ACTIVE_LEARNER_ID, COURSE_ID)]).then(([profile, diagnosis]) => { if (cancelled) return; if (!profile.totalKnowledgePoints) setView({ status: 'empty' }); else setView({ status: 'ready', profile, diagnosis }); }).catch(() => { if (!cancelled) setView({ status: 'error', message: '暂时无法生成学习诊断，请稍后再试。' }); }); return () => { cancelled = true; }; }, []);
  const ready = view.status === 'ready' ? view : null;
  const focus = ready?.diagnosis.primaryFocus ?? null;
  const selectedPoint = ready?.profile.knowledgePoints.find((point) => point.knowledgePointId === selectedId) ?? focus ?? ready?.profile.knowledgePoints[0] ?? null;
  const companion = <CompanionPanel state={view.status === 'loading' ? 'analyzing' : focus ? 'encourage' : 'idle'} eyebrow={view.status === 'loading' ? '小涟正在分析' : focus ? '小涟发现' : '小涟说明'} title={focus ? `优先关注「${focus.knowledgePointName}」` : '诊断只依据真实证据'} message={view.status === 'error' ? '画像与诊断没有成功加载，因此不展示模拟结论。' : focus ? buildDiagnosisAdvice(ready!.diagnosis)[0] ?? '当前诊断已形成。' : '没有足够证据时，我会保持未知，而不是把它当作薄弱。'} details={ready && <div className="space-y-2 text-xs text-[var(--em-muted-ink)]"><p>覆盖：{ready.profile.assessedCount}/{ready.profile.totalKnowledgePoints} 个知识点</p><p>综合掌握：{ready.profile.insufficientData ? '数据不足' : formatDiagnosisPercent(ready.profile.overallMastery, true)}</p></div>} />;
  return <AppShell companion={companion} scene="galaxy"><div className="mx-auto max-w-6xl space-y-5">
    <header><p className="flex items-center gap-2 text-xs font-semibold text-primary-700"><Compass className="h-4 w-4" />LEARNING OBSERVATION</p><h1 className="mt-2 text-3xl font-bold">学习观察空间</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--em-muted-ink)]">从真实学习证据观察当前状态；没有证据的部分保持未知。</p></header>
    {view.status === 'loading' && <LearningState kind="loading" title="小涟正在分析你的学习星点" description="正在读取学习画像与诊断证据…" />}
    {view.status === 'error' && <LearningState kind="error" title={view.message} description="真实数据没有加载成功，因此不会显示模拟学习状态。" action={<Button variant="outline" onClick={() => void load()} className="gap-2"><RotateCw className="h-4 w-4" />重新加载</Button>} />}
    {view.status === 'empty' && <LearningState kind="empty" title="还没有足够学习证据" description="完成一次学习或快速练习后，小涟会逐步了解你的学习状态。" />}
    {ready && <>
      <div className="grid gap-3 sm:grid-cols-[1.2fr_repeat(3,minmax(0,.7fr))]"><div className="rounded-[20px] border border-violet-100 bg-white/55 p-4"><p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><CheckCircle2 className="h-4 w-4 text-emerald-500" />当前课程</p><p className="mt-2 font-bold">{ready.profile.courseName}</p></div><div className="rounded-[20px] border border-violet-100 bg-white/55 p-4"><p className="text-xs text-[var(--em-muted-ink)]">已观察</p><p className="mt-2 text-xl font-bold">{ready.profile.assessedCount}/{ready.profile.totalKnowledgePoints}</p></div><div className="rounded-[20px] border border-violet-100 bg-white/55 p-4"><p className="text-xs text-[var(--em-muted-ink)]">熟练 / 掌握</p><p className="mt-2 text-xl font-bold">{ready.profile.statusCounts.proficient} / {ready.profile.statusCounts.mastered}</p></div><div className="rounded-[20px] border border-violet-100 bg-white/55 p-4"><p className="text-xs text-[var(--em-muted-ink)]">未知 / 证据不足</p><p className="mt-2 text-xl font-bold">{ready.profile.statusCounts.unassessed} / {ready.profile.statusCounts.insufficient_evidence}</p></div></div>
      {focus && <GlassPanel className="p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-fuchsia-50 text-fuchsia-600"><Lightbulb className="h-4 w-4" /></span><div><p className="text-xs font-semibold text-fuchsia-700">当前最值得关注 · {focus.knowledgePointName}</p><p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">{buildDiagnosisAdvice(ready.diagnosis)[0]}</p></div></div></GlassPanel>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]"><GlassPanel className="p-5 sm:p-6"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary-600" /><h2 className="text-xl font-bold">知识状态分布</h2></div><p className="mt-1 text-sm text-[var(--em-muted-ink)]">选择一个星点，查看证据、可信度、判断原因与当前路线关系。</p><div className="mt-5"><KnowledgeStarMap points={ready.profile.knowledgePoints} primaryFocusId={ready.diagnosis.primaryFocus?.knowledgePointId} selectedId={selectedPoint?.knowledgePointId} onSelect={(point) => setSelectedId(point.knowledgePointId)} /></div></GlassPanel>{selectedPoint && <PointInspector point={selectedPoint} inCurrentPlan={currentPlan.plan?.tasks.some((task) => task.knowledgePointId === selectedPoint.knowledgePointId) ?? false} />}</div>
      {ready.diagnosis.unassessedPoints.length > 0 && <GlassPanel className="p-6"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-slate-400" /><h2 className="text-lg font-bold">还不了解的部分</h2></div><p className="mt-1 text-sm text-[var(--em-muted-ink)]">未评估与证据不足不代表薄弱，只是暂时没有足够信息判断。</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{ready.diagnosis.unassessedPoints.map((point) => <div key={point.knowledgePointId} className="rounded-[18px] border border-slate-100 bg-white/50 p-4"><p className="text-sm font-semibold">{point.knowledgePointName}</p><p className="mt-1 text-xs text-slate-500">{getDiagnosisTone(point.status).label} · 掌握度 {formatDiagnosisPercent(point.masteryScore, isAssessedDiagnosis(point.status))}</p></div>)}</div></GlassPanel>}
    </>}
  </div></AppShell>;
}
