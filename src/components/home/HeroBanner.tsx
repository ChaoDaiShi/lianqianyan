import { ArrowRight, Bot, PlayCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { DiagnosisResult, LearnerProfile, PersistedStudyPlan } from '@/domain';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import type {
  XiaolianCompanionState,
  XiaolianRuntimeState,
} from '@/store';

interface HeroBannerProps {
  profile: LearnerProfile | null;
  diagnosis: DiagnosisResult | null;
  plan: PersistedStudyPlan | null;
  loading: boolean;
  error: boolean;
  runtimeState: XiaolianRuntimeState;
  companionState: XiaolianCompanionState;
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

export function HeroBanner({ profile, diagnosis, plan, loading, error, runtimeState, companionState, onPrepareTask }: HeroBannerProps) {
  const focus = diagnosis?.primaryFocus ?? null;
  const orderedTasks = [...(plan?.tasks ?? [])].sort((a, b) => a.order - b.order);
  const nextTask = (focus ? orderedTasks.find((task) => task.knowledgePointId === focus.knowledgePointId) : null) ?? orderedTasks[0] ?? null;
  const hasPartialError = profile === null || diagnosis === null || plan === null;
  const observation = loading ? '我正在读取你的学习画像、诊断与当前计划。' : diagnosis === null && error ? '学习诊断暂时没有加载成功，我不会用推测内容补齐。' : focus ? `我注意到「${focus.knowledgePointName}」是当前最值得关注的知识点。` : profile ? `${profile.courseName}的学习状态已同步，目前没有可证明的优先薄弱项。` : '当前还没有可用的学习画像。';
  const suggestion = nextTask ? `建议先完成「${nextTask.knowledgePointName}」。` : hasPartialError && error ? '当前计划不可用，可以稍后重试“我的学习”。' : '当前没有 ACTIVE 学习任务，可以先到“我的学习”生成计划。';

  return <GlassPanel className="relative min-h-[500px] overflow-hidden p-6 sm:p-8 lg:p-10">
    <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-companion/20 blur-3xl" /><div className="absolute -right-16 -top-16 h-80 w-80 rounded-full bg-star/20 blur-3xl" />
    <div className="relative grid min-h-[430px] items-center gap-6 lg:grid-cols-[minmax(18rem,.8fr)_minmax(0,1.2fr)]">
      <XiaolianCharacter runtimeState={runtimeState} companionState={companionState} size="hero" priority />
      <div className="text-center lg:text-left"><p className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/65 px-3 py-1 text-xs font-semibold text-primary-700"><Sparkles className="h-3.5 w-3.5 text-companion" />{runtimeState === 'idle' ? COMPANION_TEXT[companionState] : RUNTIME_TEXT[runtimeState]}</p><h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">今天，我陪你从下一步开始</h1><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[var(--em-muted-ink)] lg:mx-0">{observation}</p><div className="mt-5 rounded-[22px] border border-white/70 bg-white/55 p-4 text-left backdrop-blur-xl"><p className="text-[10px] font-bold tracking-[0.16em] text-primary-600">CURRENT SUGGESTION</p><p className="mt-2 text-sm font-semibold leading-6">{suggestion}</p></div><div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">{nextTask ? <Button type="button" onClick={onPrepareTask} className="h-11 gap-2 rounded-2xl bg-primary-500 px-5"><PlayCircle className="h-4 w-4" />开始当前任务</Button> : <Button asChild className="h-11 gap-2 rounded-2xl bg-primary-500 px-5"><Link to="/my-learning"><PlayCircle className="h-4 w-4" />查看我的学习</Link></Button>}<Button asChild variant="outline" className="h-11 gap-2 rounded-2xl border-violet-200 bg-white/70 px-5"><Link to="/xiaolian"><Bot className="h-4 w-4" />和小涟聊聊<ArrowRight className="h-4 w-4" /></Link></Button></div></div>
    </div>
  </GlassPanel>;
}
