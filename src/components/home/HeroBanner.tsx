import { ArrowRight, Loader2, PlayCircle, Sparkles } from 'lucide-react';
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
        .filter((item) => item.knowledgePointId === currentTask.knowledgePointId)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
    : null;
  const action = selectHomePrimaryAction({ diagnosis, plan, task: currentTask });
  const suggestion = currentTask
    ? latestTaskEvidence
      ? `继续「${currentTask.knowledgePointName}」，最近一次相关学习证据已记录。`
      : `从「${currentTask.knowledgePointName}」开始，完成后会留下真实学习证据。`
    : action.kind === 'diagnosis'
      ? '先完成一次诊断，我们再一起确认最值得投入的方向。'
      : '诊断已经就绪，可以据此生成一份真实学习计划。';

  const primaryAction = action.kind === 'diagnosis' ? (
    <span data-primary-action="diagnosis">
      <Button asChild className="h-11 gap-2 rounded-full bg-primary-600 px-6 shadow-[0_12px_30px_rgba(119,94,220,0.22)] hover:bg-primary-700">
        <Link to="/diagnosis">
          <PlayCircle className="h-4 w-4" />
          {action.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </span>
  ) : action.kind === 'task' ? (
    <Button type="button" data-primary-action="task" onClick={onPrepareTask} className="h-11 gap-2 rounded-full bg-primary-600 px-6 shadow-[0_12px_30px_rgba(119,94,220,0.22)] hover:bg-primary-700">
      <PlayCircle className="h-4 w-4" />
      {action.label}
      <ArrowRight className="h-4 w-4" />
    </Button>
  ) : (
    <Button type="button" data-primary-action="plan" onClick={onGeneratePlan} disabled={generating} className="h-11 gap-2 rounded-full bg-primary-600 px-6 shadow-[0_12px_30px_rgba(119,94,220,0.22)] hover:bg-primary-700">
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {generating ? '正在生成计划…' : action.label}
      {!generating ? <ArrowRight className="h-4 w-4" /> : null}
    </Button>
  );

  return (
    <section className="relative isolate min-h-[430px] overflow-hidden rounded-[2rem] border border-white/70 bg-[color:var(--em-surface)]/78 px-5 py-7 shadow-[0_24px_64px_rgba(85,66,145,0.1)] sm:px-8 sm:py-9 lg:px-12">
      <div aria-hidden="true" className="absolute inset-x-[6%] bottom-0 h-px bg-gradient-to-r from-transparent via-primary-300/80 to-transparent" />
      <div aria-hidden="true" className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-companion/15 blur-3xl" />
      <div className="relative grid items-center gap-3 sm:min-h-[430px] sm:gap-7 lg:grid-cols-[minmax(18rem,.78fr)_minmax(0,1.22fr)]">
        <XiaolianCharacter runtimeState={runtimeState} companionState={companionState} size="hero" priority />
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/60 px-3 py-1 text-xs font-semibold text-primary-700">
            <Sparkles className="h-3.5 w-3.5 text-companion" />
            {runtimeState === 'idle' ? COMPANION_TEXT[companionState] : RUNTIME_TEXT[runtimeState]}
          </p>
          <h1 className="mt-4 text-[2rem] font-bold leading-tight tracking-[-0.035em] sm:mt-5 sm:text-5xl">今天，先完成这一步</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--em-muted-ink)] sm:mt-5 lg:mx-0">{observation}</p>
          <div className="mx-auto mt-5 max-w-xl border-l-2 border-primary-300 pl-4 text-left lg:mx-0">
            <p className="text-[10px] font-bold tracking-[0.16em] text-primary-600">小涟的当前观察</p>
            <p className="mt-2 text-sm font-semibold leading-6">{suggestion}</p>
          </div>
          <div data-home-primary-action="true" className="mt-6 flex justify-center lg:justify-start">{primaryAction}</div>
        </div>
      </div>
    </section>
  );
}
