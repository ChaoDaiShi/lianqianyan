import {
  ArrowRight,
  BookOpenCheck,
  Loader2,
  PlayCircle,
  Sparkles,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type {
  DiagnosisResult,
  LearnerProfile,
  PersistedStudyPlan,
  PersistedStudyTask,
} from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import type {
  XiaolianCompanionState,
  XiaolianRuntimeState,
} from '@/store';
import { selectHomePrimaryAction } from './homePresentation';
import { buildEvidenceOrbit, EvidenceOrbit } from './EvidenceOrbit';

interface HeroBannerProps {
  profile: LearnerProfile | null;
  diagnosis: DiagnosisResult | null;
  plan: PersistedStudyPlan | null;
  evidence: LearningEvidence[];
  currentTask: PersistedStudyTask | null;
  loading: boolean;
  error: boolean;
  generating: boolean;
  runtimeState: XiaolianRuntimeState;
  companionState: XiaolianCompanionState;
  onGeneratePlan: () => void;
  onPrepareTask: () => void;
}

const RUNTIME_TEXT: Record<XiaolianRuntimeState, string> = {
  idle: '小涟正在等你一起开始',
  thinking: '小涟正在理解你的问题',
  loading: '小涟正在同步真实学习数据',
};

const COMPANION_TEXT: Record<XiaolianCompanionState, string> = {
  companion: '小涟正在等你一起开始',
  encouraging: '小涟会陪你继续推进',
  reminding: '小涟已经整理好当前提醒',
  celebrating: '小涟正在为这次学习成果庆祝',
};

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div data-home-metric="true" className="rounded-[20px] border border-violet-100/90 bg-white/58 px-4 py-3.5 backdrop-blur">
      <p className="text-xs font-medium text-[var(--em-muted-ink)]">{label}</p>
      <strong className="mt-1 block truncate text-base text-[var(--em-ink)]">{value}</strong>
    </div>
  );
}

export function HeroBanner({
  profile,
  diagnosis,
  plan,
  evidence,
  currentTask,
  loading,
  error,
  generating,
  runtimeState,
  companionState,
  onGeneratePlan,
  onPrepareTask,
}: HeroBannerProps) {
  const focus = diagnosis?.primaryFocus ?? null;
  const orbit = buildEvidenceOrbit({
    diagnosis,
    plan,
    task: currentTask,
    evidence,
  });
  const observation = loading
    ? '我正在读取你的学习画像、诊断与当前计划。'
    : diagnosis === null && error
      ? '学习诊断暂时没有加载成功，我不会用推测内容补齐。'
      : focus
        ? `我注意到「${focus.knowledgePointName}」是当前最值得关注的知识点。`
        : profile
          ? `${profile.courseName}的学习状态已同步，目前没有可证明的优先薄弱项。`
          : '当前还没有可用的学习画像。';
  const latestTaskEvidence = currentTask
    ? evidence
        .filter(
          (item) => item.knowledgePointId === currentTask.knowledgePointId,
        )
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
    : null;
  const action = selectHomePrimaryAction({
    diagnosis,
    plan,
    task: currentTask,
  });
  const suggestion = currentTask
    ? latestTaskEvidence
      ? `继续「${currentTask.knowledgePointName}」，最近一次相关学习证据已记录。`
      : `从「${currentTask.knowledgePointName}」开始，完成后会留下真实学习证据。`
    : action.kind === 'diagnosis'
      ? '先完成一次诊断，我们再一起确认最值得投入的方向。'
      : '诊断已经就绪，可以据此生成一份真实学习计划。';

  const primaryAction =
    action.kind === 'diagnosis' ? (
      <span data-primary-action="diagnosis">
        <Button asChild className="h-12 gap-2 rounded-full px-6">
          <Link to="/diagnosis">
            <PlayCircle className="h-4 w-4" />
            {action.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </span>
    ) : action.kind === 'task' ? (
      <Button
        type="button"
        data-primary-action="task"
        onClick={onPrepareTask}
        className="h-12 gap-2 rounded-full px-6"
      >
        <PlayCircle className="h-4 w-4" />
        {action.label}
        <ArrowRight className="h-4 w-4" />
      </Button>
    ) : (
      <Button
        type="button"
        data-primary-action="plan"
        onClick={onGeneratePlan}
        disabled={generating}
        className="h-12 gap-2 rounded-full px-6"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {generating ? '正在生成计划…' : action.label}
        {!generating && <ArrowRight className="h-4 w-4" />}
      </Button>
    );

  return (
    <section
      data-learning-command-center="true"
      className="relative isolate overflow-hidden rounded-[2rem] border border-white/75 bg-[color:var(--em-surface)]/76 px-5 py-6 shadow-[0_28px_80px_rgba(76,62,132,0.12)] backdrop-blur-2xl sm:px-8 sm:py-8 lg:px-10"
    >
      <div
        aria-hidden="true"
        className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-companion/14 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-star/15 blur-3xl"
      />
      <div className="relative grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1.02fr)_minmax(22rem,.98fr)] lg:items-center xl:gap-10">
        <div className="min-w-0 text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/65 px-3.5 py-2 text-[13px] font-semibold text-primary-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-companion" />
            {runtimeState === 'idle'
              ? COMPANION_TEXT[companionState]
              : RUNTIME_TEXT[runtimeState]}
          </p>
          <p className="mt-6 text-xs font-bold tracking-[0.17em] text-primary-600">
            TODAY&apos;S LEARNING COMMAND
          </p>
          <h1 className="mt-2 text-[2.15rem] font-bold leading-[1.12] tracking-[-0.04em] sm:text-5xl">
            今天，把这一步做扎实
          </h1>
          <p data-home-observation="true" className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--em-muted-ink)] sm:text-[17px] lg:mx-0">
            {observation}
          </p>
          <div className="mx-auto mt-5 max-w-xl rounded-[22px] border border-violet-100/90 bg-white/56 p-4 text-left lg:mx-0">
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-primary-600">
              <Target className="h-3.5 w-3.5" />
              小涟的当前观察
            </p>
            <p className="mt-2 text-[15px] font-semibold leading-7 sm:text-base">{suggestion}</p>
          </div>
          <div
            data-home-primary-action="true"
            className="mt-6 flex justify-center lg:justify-start"
          >
            {primaryAction}
          </div>
        </div>

        <div className="relative min-w-0 rounded-[30px] border border-violet-100/80 bg-gradient-to-br from-white/78 via-violet-50/52 to-sky-50/58 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:p-5">
          <div className="absolute right-4 top-4 z-10 hidden items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-primary-700 shadow-sm sm:flex">
            <BookOpenCheck className="h-3.5 w-3.5" />
            真实证据驱动
          </div>
          <div className="absolute left-4 top-4 z-10 hidden sm:block">
            <XiaolianCharacter
              runtimeState={runtimeState}
              companionState={companionState}
              size="sm"
              priority
            />
          </div>
          <EvidenceOrbit model={orbit} />
          <div className="grid grid-cols-3 gap-3">
            <Metric label="当前重点" value={orbit.focusTitle} />
            <Metric label="计划任务" value={`${orbit.taskCount} 项`} />
            <Metric label="学习证据" value={`${orbit.evidenceCount} 条`} />
          </div>
        </div>
      </div>
    </section>
  );
}
