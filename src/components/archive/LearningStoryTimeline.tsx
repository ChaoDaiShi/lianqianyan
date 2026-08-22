import {
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  PlayCircle,
  RotateCw,
} from 'lucide-react';
import type { PersistedStudyPlan } from '@/domain';
import type {
  LearningEvidence,
  PracticeEvaluationResponse,
} from '@/lib/educationApi';
import { GlassPanel } from '@/components/design/GlassPanel';
import {
  buildLearningStories,
  type LearningStoryItem,
} from '@/components/xiaolian/xiaolianMemory';
import { Button } from '@/components/ui/button';

export interface LearningStoryTimelineProps {
  evidence: LearningEvidence[];
  plan: PersistedStudyPlan | null;
  practiceEvaluations: PracticeEvaluationResponse[];
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
} satisfies Record<LearningStoryItem['kind'], typeof BookOpenText>;

function formatTimestamp(occurredAt: string): string {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return occurredAt;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function LearningStoryTimeline({
  evidence,
  plan,
  practiceEvaluations,
  knowledgeNames,
  learnerId,
  courseId,
  loading,
  error,
  onRetry,
}: LearningStoryTimelineProps) {
  const stories = buildLearningStories({
    evidence,
    plan,
    practiceEvaluations,
    knowledgeNames,
    learnerId,
    courseId,
  });

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <BookOpenText className="h-4 w-4 text-primary-600" />
        <p className="text-[10px] font-bold text-primary-600">LEARNING STORY</p>
      </div>
      <h2 className="mt-1 text-xl font-bold">学习成长故事</h2>
      <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
        故事来自真实学习证据、练习反馈与当前计划；计划内容只提供方向。
      </p>

      {loading && (
        <p className="mt-4 border-l-2 border-violet-200 py-1 pl-3 text-sm text-[var(--em-muted-ink)]">
          正在读取最近学习证据，当前计划故事仍可查看。
        </p>
      )}
      {error && (
        <div className="mt-4 border-l-2 border-amber-300 py-1 pl-3">
          <p className="text-sm text-amber-800">
            最近学习证据暂时无法读取，当前计划故事仍可查看。
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3 gap-2"
          >
            <RotateCw className="h-3.5 w-3.5" />
            重新加载学习证据
          </Button>
        </div>
      )}

      {!loading && !error && stories.length === 0 && (
        <div className="mt-5 border-t border-dashed border-violet-200 pt-4">
          <p className="text-sm font-semibold">还没有可展示的成长故事。</p>
          <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
            这里不会根据空白状态自动编写学习经历。
          </p>
        </div>
      )}

      {stories.length > 0 && (
        <ol className="mt-5 space-y-4">
          {stories.map((story, index) => {
            const Icon = STORY_ICON[story.kind];

            return (
              <li key={story.id} className="relative flex gap-3">
                <div className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-violet-100 bg-white text-primary-600">
                  <Icon className="h-4 w-4" />
                </div>
                {index < stories.length - 1 && (
                  <span className="absolute bottom-[-1rem] left-[17px] top-9 w-px bg-violet-100" />
                )}
                <article className="min-w-0 flex-1 border-b border-violet-100 pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <strong className="text-sm">{story.headline}</strong>
                    <time
                      dateTime={story.occurredAt}
                      className="text-[11px] text-[var(--em-muted-ink)]"
                    >
                      {formatTimestamp(story.occurredAt)}
                    </time>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
                    {story.body}
                  </p>
                  {story.planContextOnly && (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      计划上下文，不表示已完成学习
                    </p>
                  )}
                  <p className="mt-3 text-[10px] font-semibold text-primary-700">
                    来源：{story.sourceLabel}
                  </p>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </GlassPanel>
  );
}
