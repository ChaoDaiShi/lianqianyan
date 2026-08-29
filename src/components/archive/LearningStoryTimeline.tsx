import {
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  MessageSquareQuote,
  PlayCircle,
  RotateCw,
} from 'lucide-react';
import type { PersistedStudyPlan } from '@/domain';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import type { LearningEvidence, PracticeEvaluationResponse } from '@/lib/educationApi';
import { buildLearningStories, type LearningStoryItem } from '@/components/xiaolian/xiaolianMemory';
import { Button } from '@/components/ui/button';

export interface LearningStoryTimelineProps {
  evidence: LearningEvidence[];
  plan: PersistedStudyPlan | null;
  practiceEvaluations: PracticeEvaluationResponse[];
  reflectionResults: ReflectionResult[];
  knowledgeNames: Record<string, string>;
  learnerId: string;
  courseId: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

const STORY_ICON = {
  plan: CalendarClock,
  plan_task: ListChecks,
  learning: PlayCircle,
  practice: CheckCircle2,
  reflection: MessageSquareQuote,
} satisfies Record<LearningStoryItem['kind'], typeof BookOpenText>;

function formatTimestamp(occurredAt: string): { date: string; time: string } {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return { date: occurredAt, time: '' };
  return {
    date: date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

export function LearningStoryTimeline({ evidence, plan, practiceEvaluations, reflectionResults, knowledgeNames, learnerId, courseId, loading, error, onRetry }: LearningStoryTimelineProps) {
  const stories = buildLearningStories({ evidence, plan, practiceEvaluations, reflectionResults, knowledgeNames, learnerId, courseId });

  return (
    <section className="rounded-[2.25rem] border border-violet-100/80 bg-white/56 px-5 py-7 shadow-[0_26px_70px_rgba(78,59,128,0.09)] sm:px-8 sm:py-9">
      <div className="flex items-center gap-2 text-primary-700"><BookOpenText className="h-4 w-4" /><p className="text-[10px] font-bold tracking-[0.16em]">LEARNING STORY</p></div>
      <h2 className="mt-2 text-2xl font-bold tracking-[-0.025em]">学习成长故事</h2>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--em-muted-ink)]">真实学习证据、练习评价与本地复述记录构成故事；当前计划只作为尚未完成的路线背景。</p>

      {loading ? <p className="mt-5 border-l-2 border-violet-200 py-1 pl-3 text-sm text-[var(--em-muted-ink)]">正在读取最近学习证据，已有故事仍可查看。</p> : null}
      {error ? <div className="mt-5 border-l-2 border-amber-300 py-1 pl-3"><p className="text-sm text-amber-800">最近学习证据暂时无法读取，已有本地记录与计划背景仍可查看。</p><Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-3 gap-2"><RotateCw className="h-3.5 w-3.5" />重新加载学习证据</Button></div> : null}

      {!loading && !error && stories.length === 0 ? <div className="mt-8 border-t border-dashed border-violet-200 pt-6"><p className="text-sm font-semibold">还没有可展示的成长故事。</p><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">这里不会根据空白状态自动编写学习经历。</p></div> : null}

      {stories.length > 0 ? <ol className="mt-8">
        {stories.map((story, index) => {
          const Icon = STORY_ICON[story.kind];
          const timestamp = formatTimestamp(story.occurredAt);
          return <li key={story.id} className="relative grid grid-cols-[3.25rem_minmax(0,1fr)] gap-4 pb-8 sm:grid-cols-[7.5rem_3.25rem_minmax(0,1fr)] sm:gap-5">
            <time dateTime={story.occurredAt} className="col-start-2 row-start-2 text-[11px] leading-5 text-[var(--em-muted-ink)] sm:col-start-1 sm:row-start-1 sm:pt-1 sm:text-right"><span className="block font-semibold text-[var(--em-ink)]">{timestamp.date}</span>{timestamp.time}</time>
            <div className="relative col-start-1 row-start-1 row-span-2 sm:col-start-2 sm:row-span-1">
              <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full border border-violet-200 bg-[var(--em-surface)] text-primary-700 shadow-[0_0_0_7px_rgba(139,114,219,0.07)]"><Icon className="h-4 w-4" /></span>
              {index < stories.length - 1 ? <span className="absolute bottom-[-2rem] left-[23px] top-12 w-px bg-violet-200" /> : null}
            </div>
            <article className="col-start-2 row-start-1 min-w-0 border-b border-violet-100 pb-6 sm:col-start-3">
              <strong className="text-base">{story.headline}</strong>
              <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">{story.body}</p>
              {story.planContextOnly ? <p className="mt-2 text-xs font-medium text-amber-700">计划上下文，不表示已完成学习</p> : null}
              <p className="mt-3 text-[10px] font-semibold text-primary-700">来源：{story.sourceLabel}</p>
            </article>
          </li>;
        })}
      </ol> : null}
    </section>
  );
}
