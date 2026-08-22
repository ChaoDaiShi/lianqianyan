import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  MessageCircleQuestion,
  PlayCircle,
  Presentation,
  Route,
  Sparkles,
  Stethoscope,
  TrendingUp,
  UserRoundSearch,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { AgentActivityTimeline, type AgentActivityNode } from '@/components/agent/AgentActivityTimeline';
import { GlassPanel } from '@/components/design/GlassPanel';
import { ModulePractice } from '@/components/learning/ModulePractice';
import { LearningPathMap } from '@/components/learning/LearningPathMap';
import { useStartPlanTask } from '@/components/learning/useStartPlanTask';
import { DemoStoryStep, type DemoStoryStatus } from '@/components/showcase/DemoStoryStep';
import { CompanionPanel } from '@/components/xiaolian/CompanionPanel';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { XiaolianMessage } from '@/components/xiaolian/XiaolianMessage';
import { Button } from '@/components/ui/button';
import { DIAGNOSIS_REASON_TEXT } from '@/domain';
import type { PracticeEvaluationResponse } from '@/lib/educationApi';
import { useCurrentPlan, useDiagnosis, useLearnerProfile, useRecentEvidence } from '@/lib/hooks';
import { DEMO_COURSE_ID, DEMO_LEARNER_ID } from '@/store';
import { getLearningModule } from '@/content/learningContent';

function requestStatus(loading: boolean, hasData: boolean): DemoStoryStatus {
  return loading ? 'running' : hasData ? 'completed' : 'waiting';
}

function percent(value: number | null | undefined) {
  return value == null ? '等待更多证据' : `${Math.round(value * 100)}%`;
}

export function DemoPage() {
  const profile = useLearnerProfile(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const diagnosis = useDiagnosis(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const plan = useCurrentPlan(DEMO_LEARNER_ID, DEMO_COURSE_ID);
  const evidence = useRecentEvidence();
  const { startTask, startingTaskId, error: startError } = useStartPlanTask();
  const [evaluation, setEvaluation] = useState<PracticeEvaluationResponse | null>(null);
  const orderedTasks = useMemo(() => [...(plan.plan?.tasks ?? [])].sort((a, b) => a.order - b.order), [plan.plan]);
  const currentTask = orderedTasks[0] ?? null;
  const module = currentTask ? getLearningModule(currentTask.knowledgePointId) : null;
  const focus = diagnosis.data?.primaryFocus ?? null;
  const reason = focus?.reasonCodes.map((code) => DIAGNOSIS_REASON_TEXT[code]).filter(Boolean).join(' ') ?? '';
  const courseEvidence = (evidence.data ?? []).filter((item) => item.learnerId === DEMO_LEARNER_ID && item.courseId === DEMO_COURSE_ID);
  const hasLearningStarted = courseEvidence.some((item) => item.evidenceType === 'learning_started');
  const loading = profile.loading || diagnosis.loading || plan.loading || evidence.loading;
  const error = profile.error || diagnosis.error || plan.error || evidence.error;
  const activityNodes: AgentActivityNode[] = [
    { id: 'profile', label: '学习画像', status: profile.loading ? 'running' : profile.data ? 'completed' : 'idle' },
    { id: 'diagnosis', label: '学习诊断', status: diagnosis.loading ? 'running' : diagnosis.data ? 'completed' : 'idle' },
    { id: 'plan', label: '学习计划', status: plan.loading || plan.generating ? 'running' : plan.plan ? 'completed' : 'idle' },
    { id: 'learning', label: '学习行动', status: startingTaskId ? 'running' : hasLearningStarted ? 'completed' : 'idle', detail: hasLearningStarted ? '已有真实 learning_started 证据' : '等待用户开始任务' },
    { id: 'assessment', label: '练习评估', status: evaluation ? 'completed' : 'idle' },
    { id: 'replanning', label: '动态调整', status: evaluation ? 'completed' : 'idle', detail: evaluation ? `本次返回：${evaluation.replanning.status}` : '等待真实练习响应' },
  ];
  const companion = <CompanionPanel state={loading ? 'analyzing' : evaluation ? 'success' : focus || currentTask ? 'encourage' : 'idle'} eyebrow="故事化演示导览" title={evaluation ? '真实学习闭环已经返回结果' : '从一个学习困难开始'} message={error ? '部分真实数据没有成功加载，因此对应故事不会使用模拟结果补齐。' : evaluation ? `本次掌握状态 ${percent(evaluation.masteryBefore)} → ${percent(evaluation.masteryAfter)}，计划返回 ${evaluation.replanning.status}。` : '沿着用户行为、小涟动作与系统能力三条线，查看真实闭环如何发生。'} />;

  return <AppShell companion={companion}><div className="space-y-6">
    <GlassPanel className="overflow-hidden p-6 sm:p-8"><div className="grid items-center gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]"><XiaolianCharacter state={loading ? 'analyzing' : 'encourage'} size="lg" /><div><p className="flex items-center gap-2 text-xs font-semibold text-primary-700"><Presentation className="h-4 w-4" />THREE-MINUTE STORY DEMO</p><h1 className="mt-2 text-3xl font-bold">一次学习困难，如何变成成长路径</h1><p className="mt-3 text-sm leading-7 text-[var(--em-muted-ink)]">八幕故事全部复用现有真实 API。读取自动发生，生成计划、开始学习和提交练习只在用户点击后执行。</p></div></div></GlassPanel>
    <AgentActivityTimeline nodes={activityNodes} title="本次故事的可验证能力状态" />

    <DemoStoryStep number={1} title="用户提出学习困难" icon={MessageCircleQuestion} status={requestStatus(diagnosis.loading || plan.loading, Boolean(focus || currentTask))} userAction={<>{focus ? `“我在「${focus.knowledgePointName}」上遇到了困难，下一步应该怎么学？”` : currentTask ? `“我想继续学习「${currentTask.knowledgePointName}」，请帮我找到合适的下一步。”` : '“我不知道现在最应该学什么，请帮我看看。”'}</>} xiaolianAction="先不急着给通用答案，我会查看当前学习状态。" systemCapability="接收学习诉求，并将问题交给已有教育能力边界。"><XiaolianMessage tone="encourage">你好，我是小涟。我们从你当前真实的学习状态出发，一步一步解决这个问题。</XiaolianMessage></DemoStoryStep>

    <DemoStoryStep number={2} title="小涟分析学习画像" icon={UserRoundSearch} status={requestStatus(profile.loading, Boolean(profile.data))} userAction="授权系统读取当前课程下已经形成的学习记录。" xiaolianAction={profile.data ? `我看到你正在学习「${profile.data.courseName}」，已有 ${profile.data.assessedCount}/${profile.data.totalKnowledgePoints} 个知识点形成评价。` : profile.error ? '学习画像暂时没有加载成功，我不会补入模拟状态。' : '正在读取学习画像。'} systemCapability="Learner Profile 将掌握记录聚合为当前学习状态；证据不足保持未知。">{profile.loading ? <p className="flex items-center gap-2 text-sm text-[var(--em-muted-ink)]"><Loader2 className="h-4 w-4 animate-spin" />正在读取真实学习画像…</p> : <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-[16px] border border-violet-100 bg-white/55 p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">课程</p><strong className="mt-1 block text-sm">{profile.data?.courseName ?? '暂不可用'}</strong></div><div className="rounded-[16px] border border-violet-100 bg-white/55 p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">综合掌握状态</p><strong className="mt-1 block text-sm">{profile.data?.insufficientData ? '证据积累中' : percent(profile.data?.overallMastery)}</strong></div><div className="rounded-[16px] border border-violet-100 bg-white/55 p-3"><p className="text-[10px] text-[var(--em-muted-ink)]">学习证据</p><strong className="mt-1 block text-sm">{courseEvidence.length} 条当前课程记录</strong></div></div>}</DemoStoryStep>

    <DemoStoryStep number={3} title="发现优先关注知识点" icon={Stethoscope} status={requestStatus(diagnosis.loading, Boolean(diagnosis.data))} userAction="等待系统基于已经形成的评价证据给出诊断。" xiaolianAction={focus ? `我发现「${focus.knowledgePointName}」是当前最值得优先关注的知识点。` : diagnosis.error ? '诊断没有成功加载，我不会把未知写成薄弱。' : '当前没有可证明的优先关注项；未评估不代表薄弱。'} systemCapability="Diagnosis Agent 读取真实画像与诊断结果，并保留原因代码和证据数量。">{focus ? <div className="grid gap-3 sm:grid-cols-2"><XiaolianMessage tone="observe" title="当前主要关注">「{focus.knowledgePointName}」· {focus.evidenceCount} 条评价证据 · 掌握状态 {percent(focus.masteryScore)}</XiaolianMessage><XiaolianMessage tone="suggest" title="诊断原因">{reason || '诊断已形成，但没有附加原因代码。'}</XiaolianMessage></div> : <XiaolianMessage tone={diagnosis.error ? 'notice' : 'observe'}>{diagnosis.error ? '诊断没有成功加载，不展示模拟结论。' : '当前没有可证明的优先关注项；未评估不代表薄弱。'}</XiaolianMessage>}</DemoStoryStep>

    <DemoStoryStep number={4} title="生成学习计划" icon={Route} status={plan.loading || plan.generating ? 'running' : plan.plan ? 'completed' : 'waiting'} userAction={plan.plan ? '查看当前 ACTIVE 学习计划。' : '点击“生成真实计划”，明确发起计划生成。'} xiaolianAction={plan.plan ? `我已经把下一步组织成 ${plan.plan.tasks.length} 项真实学习任务。` : '当前没有 ACTIVE 计划；只有你点击后我才会生成。'} systemCapability="Planner Agent 读取 Current Plan；生成按钮调用现有计划生成 API。">{plan.loading ? <p className="flex items-center gap-2 text-sm text-[var(--em-muted-ink)]"><Loader2 className="h-4 w-4 animate-spin" />正在读取 Current Plan…</p> : plan.plan ? <LearningPathMap points={profile.data?.knowledgePoints ?? []} currentKnowledgePointId={currentTask?.knowledgePointId ?? ''} planTasks={orderedTasks} primaryFocusId={focus?.knowledgePointId} /> : <div><XiaolianMessage tone={plan.error ? 'notice' : 'suggest'}>{plan.error ? '当前计划读取失败，因此不能展示模拟任务。' : '当前没有 ACTIVE 学习计划。点击后会调用真实计划生成 API。'}</XiaolianMessage><Button className="mt-4 rounded-xl bg-primary-500" onClick={() => void plan.generate()} disabled={plan.generating}>{plan.generating ? <><Loader2 className="h-4 w-4 animate-spin" />正在生成…</> : <><BrainCircuit className="h-4 w-4" />生成真实计划</>}</Button></div>}</DemoStoryStep>

    <DemoStoryStep number={5} title="进入学习空间" icon={PlayCircle} status={startingTaskId ? 'running' : hasLearningStarted ? 'completed' : 'waiting'} userAction="点击当前任务，明确开始一次学习行动。" xiaolianAction={currentTask ? `我会陪你进入「${currentTask.knowledgePointName}」的学习空间。` : '需要先加载或生成真实计划。'} systemCapability="记录 learning_started Evidence，并携带真实 plan/task/knowledge point 上下文进入空间。">{currentTask && plan.plan ? <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-violet-100 bg-white/50 p-4"><div><p className="text-xs text-[var(--em-muted-ink)]">任务 {currentTask.order} / {plan.plan.tasks.length}</p><strong className="mt-1 block">{currentTask.knowledgePointName}</strong><p className="mt-1 text-xs text-[var(--em-muted-ink)]">点击会记录真实开始学习证据，并跳转到任务空间。</p></div><Button onClick={() => void startTask(plan.plan!, currentTask)} disabled={startingTaskId === currentTask.id} className="gap-2 rounded-xl bg-primary-500">{startingTaskId === currentTask.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{startingTaskId === currentTask.id ? '正在记录…' : '开始当前任务'}</Button></div> : <XiaolianMessage tone="notice">先生成或加载真实 Current Plan，才能进入对应任务。</XiaolianMessage>}{startError && <p className="mt-3 text-sm text-amber-700">{startError}</p>}</DemoStoryStep>

    <DemoStoryStep number={6} title="完成练习" icon={CheckCircle2} status={evaluation ? 'completed' : 'waiting'} userAction="选择答案并点击提交，形成一次真实评价行为。" xiaolianAction="我会等待服务端评价返回，不在前端预先修改掌握状态。" systemCapability="Practice API 在证据与掌握度事务边界内记录结果，并返回完整评价。">{currentTask && module?.questions.length ? <ModulePractice taskId={currentTask.id} knowledgePointName={currentTask.knowledgePointName} questions={module.questions} onEvaluationComplete={setEvaluation} onPracticeComplete={async (replanning) => { const results = await Promise.all([profile.refetch(), diagnosis.refetch(), evidence.refetch(), replanning.status === 'performed' ? plan.refetch() : Promise.resolve(true)]); return results.every(Boolean); }} /> : <XiaolianMessage tone="notice">当前计划首任务没有配置前端教学练习题，因此不临时生成题目或评价数据。</XiaolianMessage>}</DemoStoryStep>

    <DemoStoryStep number={7} title="展示能力变化" icon={TrendingUp} status={evaluation ? 'completed' : 'waiting'} userAction="查看本次练习前后的真实掌握状态，而不是领取前端奖励。" xiaolianAction={evaluation ? evaluation.masteryAfter > evaluation.masteryBefore ? '这次练习帮助你进一步巩固了当前知识点。' : evaluation.masteryAfter < evaluation.masteryBefore ? '这次练习暴露出仍需巩固的内容。' : '学习状态已根据本次评价更新。' : '等待真实练习响应后再解释变化。'} systemCapability="Mastery before、after 与 confidence 全部来自 PracticeEvaluationResponse。">{evaluation ? <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-[16px] border border-violet-100 bg-white/55 p-4"><p className="text-[10px] text-[var(--em-muted-ink)]">练习前</p><strong className="mt-1 block text-lg">{percent(evaluation.masteryBefore)}</strong></div><div className="rounded-[16px] border border-primary-200 bg-primary-50/50 p-4"><p className="text-[10px] text-primary-600">练习后</p><strong className="mt-1 block text-lg text-primary-700">{percent(evaluation.masteryAfter)}</strong></div><div className="rounded-[16px] border border-violet-100 bg-white/55 p-4"><p className="text-[10px] text-[var(--em-muted-ink)]">可信度</p><strong className="mt-1 block text-lg">{percent(evaluation.confidence)}</strong></div></div> : <XiaolianMessage tone="observe">等待第 6 幕返回真实评价；在此之前不推测能力变化。</XiaolianMessage>}</DemoStoryStep>

    <DemoStoryStep number={8} title="动态调整计划" icon={BrainCircuit} status={evaluation ? 'completed' : 'waiting'} userAction="查看本次评价是否需要改变当前学习路径。" xiaolianAction={evaluation ? evaluation.replanning.status === 'performed' ? '学习状态发生了足以调整计划的变化，我已呈现新的优先任务。' : evaluation.replanning.status === 'not_needed' ? '状态已经更新，但当前计划仍适合你。' : '评价已记录，但本次计划调整没有成功。' : '等待真实 Replanning 结果。'} systemCapability="Dynamic Replanning 只依据本次响应呈现 performed、not_needed 或 failed。">{evaluation ? <XiaolianMessage tone={evaluation.replanning.status === 'failed' ? 'notice' : evaluation.replanning.status === 'performed' ? 'success' : 'suggest'} title="本次计划结果">{evaluation.replanning.status === 'performed' ? `计划已调整${evaluation.replanning.previousTopTask && evaluation.replanning.newTopTask ? `：${evaluation.replanning.previousTopTask.knowledgePointName} → ${evaluation.replanning.newTopTask.knowledgePointName}` : '。'}` : evaluation.replanning.status === 'not_needed' ? '学习状态已更新，当前计划仍然适合。' : '练习结果已记录，但计划调整未成功。'}</XiaolianMessage> : <XiaolianMessage tone="observe">等待真实 PracticeEvaluationResponse；在响应返回前，不推测 Replanning 结果。</XiaolianMessage>}</DemoStoryStep>

    <GlassPanel className="p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-bold text-primary-600"><Sparkles className="h-3.5 w-3.5" />故事闭环</p><h2 className="mt-2 text-xl font-bold">学习不是一次回答，而是一条持续更新的路径</h2><p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">真实学习行动形成证据，证据更新学习状态，新的状态再影响下一步诊断与计划。</p></div><BookOpen className="h-9 w-9 text-primary-500" /></div></GlassPanel>
  </div></AppShell>;
}
