import { useEffect, useState } from 'react';
import { CheckCircle2, Lightbulb, RotateCw, ShieldAlert, Stethoscope, Target } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { LearningState } from '@/components/feedback/LearningState';
import { KnowledgeStarMap } from '@/components/diagnosis/KnowledgeStarMap';
import { CompanionPanel } from '@/components/xiaolian/CompanionPanel';
import { buildDiagnosisAdvice, diagnosisReasons, formatDiagnosisPercent, getDiagnosisTone, isAssessedDiagnosis } from '@/components/diagnosis/diagnosisPresentation';
import { Button } from '@/components/ui/button';
import { fetchDiagnosis, fetchLearnerProfile } from '@/lib/educationApi';
import type { DiagnosisResult, KnowledgePointDiagnosis, LearnerProfile } from '@/domain';
import { DEMO_LEARNER_ID } from '@/store';

const COURSE_ID = 'course-os';
type ViewState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'empty' } | { status: 'ready'; profile: LearnerProfile; diagnosis: DiagnosisResult };

function FocusDetail({ point }: { point: KnowledgePointDiagnosis }) {
  const tone = getDiagnosisTone(point.status);
  return <GlassPanel className="p-6"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-fuchsia-500" /><h2 className="text-lg font-bold">当前最值得优先关注</h2></div><div className="mt-4 rounded-[20px] border border-fuchsia-100 bg-fuchsia-50/50 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{point.knowledgePointName}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>{tone.label}</span></div><div className="mt-3 space-y-1">{diagnosisReasons(point).map((reason) => <p key={reason} className="text-sm leading-6 text-[var(--em-muted-ink)]">{reason}</p>)}</div><p className="mt-3 text-xs text-[var(--em-muted-ink)]">已评估 {point.evidenceCount} 次 · 掌握度 {formatDiagnosisPercent(point.masteryScore, true)} · 可信度 {formatDiagnosisPercent(point.confidence, true)}</p></div></GlassPanel>;
}

export default function DiagnosisPage() {
  const [view, setView] = useState<ViewState>({ status: 'loading' });
  const load = () => { setView({ status: 'loading' }); return Promise.all([fetchLearnerProfile(DEMO_LEARNER_ID, COURSE_ID), fetchDiagnosis(DEMO_LEARNER_ID, COURSE_ID)]).then(([profile, diagnosis]) => { if (!profile.totalKnowledgePoints) setView({ status: 'empty' }); else setView({ status: 'ready', profile, diagnosis }); }).catch(() => setView({ status: 'error', message: '暂时无法生成学习诊断，请稍后再试。' })); };
  useEffect(() => { let cancelled = false; setView({ status: 'loading' }); Promise.all([fetchLearnerProfile(DEMO_LEARNER_ID, COURSE_ID), fetchDiagnosis(DEMO_LEARNER_ID, COURSE_ID)]).then(([profile, diagnosis]) => { if (cancelled) return; if (!profile.totalKnowledgePoints) setView({ status: 'empty' }); else setView({ status: 'ready', profile, diagnosis }); }).catch(() => { if (!cancelled) setView({ status: 'error', message: '暂时无法生成学习诊断，请稍后再试。' }); }); return () => { cancelled = true; }; }, []);
  const ready = view.status === 'ready' ? view : null;
  const focus = ready?.diagnosis.primaryFocus ?? null;
  const companion = <CompanionPanel state={view.status === 'loading' ? 'analyzing' : focus ? 'encourage' : 'idle'} eyebrow={view.status === 'loading' ? '小涟正在分析' : focus ? '小涟发现' : '小涟说明'} title={focus ? `优先关注「${focus.knowledgePointName}」` : '诊断只依据真实证据'} message={view.status === 'error' ? '画像与诊断没有成功加载，因此不展示模拟结论。' : focus ? buildDiagnosisAdvice(ready!.diagnosis)[0] ?? '当前诊断已形成。' : '没有足够证据时，我会保持未知，而不是把它当作薄弱。'} details={ready && <div className="space-y-2 text-xs text-[var(--em-muted-ink)]"><p>覆盖：{ready.profile.assessedCount}/{ready.profile.totalKnowledgePoints} 个知识点</p><p>综合掌握：{ready.profile.insufficientData ? '数据不足' : formatDiagnosisPercent(ready.profile.overallMastery, true)}</p></div>} />;
  return <AppShell companion={companion}><div className="space-y-6">
    <div><p className="flex items-center gap-2 text-xs font-semibold text-primary-700"><Stethoscope className="h-4 w-4" />LEARNING HEALTH REPORT</p><h1 className="mt-2 text-3xl font-bold">小涟陪你读懂学习诊断</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--em-muted-ink)]">每一个判断都来自真实学习证据、掌握度与可信度。</p></div>
    {view.status === 'loading' && <LearningState kind="loading" title="小涟正在分析你的学习星点" description="正在读取学习画像与诊断证据…" />}
    {view.status === 'error' && <LearningState kind="error" title={view.message} description="真实数据没有加载成功，因此不会显示模拟学习状态。" action={<Button variant="outline" onClick={() => void load()} className="gap-2"><RotateCw className="h-4 w-4" />重新加载</Button>} />}
    {view.status === 'empty' && <LearningState kind="empty" title="还没有足够学习证据" description="完成一次学习或快速练习后，小涟会逐步了解你的学习状态。" />}
    {ready && <>
      <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-violet-100 bg-white/50 px-4 py-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><strong>{ready.profile.courseName}</strong><span className="text-[var(--em-muted-ink)]">诊断覆盖 {Math.round(ready.profile.coverage * 100)}%</span><span className="text-[var(--em-muted-ink)]">画像可信度 {formatDiagnosisPercent(ready.profile.overallConfidence, true)}</span>{ready.profile.insufficientData && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">数据尚不充足</span>}</div>
      <GlassPanel className="p-6"><div className="flex items-center gap-2 text-primary-700"><Lightbulb className="h-4 w-4" /><h2 className="font-bold">小涟分析依据</h2></div><div className="mt-3 space-y-2">{buildDiagnosisAdvice(ready.diagnosis).map((line) => <p key={line} className="text-sm leading-7 text-[var(--em-muted-ink)]">{line}</p>)}</div></GlassPanel>
      <GlassPanel className="p-5 sm:p-6"><h2 className="text-xl font-bold">知识星图</h2><p className="mt-1 text-sm text-[var(--em-muted-ink)]">每个节点都保留真实证据、可信度和掌握状态。</p><div className="mt-5"><KnowledgeStarMap points={ready.profile.knowledgePoints} primaryFocusId={ready.diagnosis.primaryFocus?.knowledgePointId} /></div></GlassPanel>
      {focus && <FocusDetail point={focus} />}
      {ready.diagnosis.unassessedPoints.length > 0 && <GlassPanel className="p-6"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-slate-400" /><h2 className="text-lg font-bold">还不了解的部分</h2></div><p className="mt-1 text-sm text-[var(--em-muted-ink)]">未评估与证据不足不代表薄弱，只是暂时没有足够信息判断。</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{ready.diagnosis.unassessedPoints.map((point) => <div key={point.knowledgePointId} className="rounded-[18px] border border-slate-100 bg-white/50 p-4"><p className="text-sm font-semibold">{point.knowledgePointName}</p><p className="mt-1 text-xs text-slate-500">{getDiagnosisTone(point.status).label} · 掌握度 {formatDiagnosisPercent(point.masteryScore, isAssessedDiagnosis(point.status))}</p></div>)}</div></GlassPanel>}
    </>}
  </div></AppShell>;
}
