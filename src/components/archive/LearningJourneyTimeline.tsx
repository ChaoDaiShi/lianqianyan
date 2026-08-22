import {
  BookOpen,
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
  buildJourneyEvents,
  type LearningJourneyEvent,
} from '@/components/learning/learningLoop';
import { Button } from '@/components/ui/button';

export interface LearningJourneyTimelineProps {
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

const EVENT_ICON = {
  plan: CalendarClock,
  plan_task: ListChecks,
  learning: PlayCircle,
  practice: CheckCircle2,
} satisfies Record<LearningJourneyEvent['kind'], typeof BookOpen>;

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

export function LearningJourneyTimeline({
  evidence,
  plan,
  practiceEvaluations,
  knowledgeNames,
  learnerId,
  courseId,
  loading,
  error,
  onRetry,
}: LearningJourneyTimelineProps) {
  const events = buildJourneyEvents({
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
        <BookOpen className="h-4 w-4 text-primary-600" />
        <p className="text-[10px] font-bold tracking-[0.18em] text-primary-600">
          LEARNING JOURNEY
        </p>
      </div>
      <h2 className="mt-1 text-xl font-bold">学习旅程</h2>
      <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
        当前计划提供上下文；只有真实 LearningEvidence 与练习评价表示已发生的学习行为。
      </p>

      {loading && (
        <p className="mt-4 rounded-[18px] border border-violet-100 bg-white/45 p-3 text-sm text-[var(--em-muted-ink)]">
          正在读取最近学习证据，当前计划上下文仍可查看。
        </p>
      )}
      {error && (
        <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50/70 p-3">
          <p className="text-sm text-amber-800">最近学习证据暂时无法读取，当前计划上下文仍可查看。</p>
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

      {!loading && !error && events.length === 0 && (
        <div className="mt-5 rounded-[18px] border border-dashed border-violet-200 bg-white/40 p-5">
          <p className="text-sm font-semibold">还没有可展示的学习旅程记录。</p>
          <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
            这里仅展示真实来源记录，也不会把计划任务当作已完成学习。
          </p>
        </div>
      )}

      {events.length > 0 && (
        <ol className="mt-5 space-y-4">
          {events.map((event, index) => {
            const Icon = EVENT_ICON[event.kind];
            const isPlanTask = event.kind === 'plan_task';

            return (
              <li key={event.id} className="relative flex gap-3">
                <div className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-violet-100 bg-white text-primary-600">
                  <Icon className="h-4 w-4" />
                </div>
                {index < events.length - 1 && (
                  <span className="absolute bottom-[-1rem] left-[17px] top-9 w-px bg-violet-100" />
                )}
                <article className="min-w-0 flex-1 rounded-[18px] border border-violet-100 bg-white/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <strong className="text-sm">{event.title}</strong>
                    <time
                      dateTime={event.occurredAt}
                      className="text-[11px] text-[var(--em-muted-ink)]"
                    >
                      {formatTimestamp(event.occurredAt)}
                    </time>
                  </div>
                  {event.detail && (
                    <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
                      {event.detail}
                    </p>
                  )}
                  {isPlanTask && (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      计划上下文，不表示已完成学习
                    </p>
                  )}
                  <p className="mt-3 text-[10px] font-semibold text-primary-700">
                    来源：{event.sourceLabel}
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
