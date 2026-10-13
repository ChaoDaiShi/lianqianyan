import { useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleDot, FileText, History, Info, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PersistedStudyPlan, PersistedStudyTask } from '@/domain';
import { ACTION_TYPE_LABEL } from '@/domain';
import { GlassPanel } from '@/components/design/GlassPanel';
import type { CompanionJourneyState } from './companionFlow';
import { cn } from '@/lib/utils';

interface WorkbenchTaskHeaderProps {
  plan: PersistedStudyPlan;
  task: PersistedStudyTask;
  state: CompanionJourneyState;
  /** 打开某个抽屉（历史/产物/上下文）。 */
  onOpenPanel?(panel: 'history' | 'artifacts' | 'context'): void;
}

const STEPS = [
  { id: 'prepare', label: '准备' },
  { id: 'learning', label: '学习' },
  { id: 'thinking', label: '思考' },
  { id: 'practice', label: '练习' },
  { id: 'reflection', label: '复述' },
  { id: 'complete', label: '完成' },
] as const satisfies ReadonlyArray<{ id: CompanionJourneyState; label: string }>;

const PANEL_ENTRIES = [
  { id: 'history', label: '历史记录', icon: History },
  { id: 'artifacts', label: '学习产物', icon: FileText },
  { id: 'context', label: '学习上下文', icon: Info },
] as const;

const PANEL_ICON_BUTTON =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--em-border)] text-[var(--em-primary-deep)] transition hover:bg-[var(--em-primary-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--em-primary)]';

/**
 * 工作台单行任务头：返回 + 任务信息 + 阶段轨 + 抽屉入口。
 * 阶段仅反映已观察到的学习互动，不代表掌握度。
 */
export function WorkbenchTaskHeader({ plan, task, state, onOpenPanel }: WorkbenchTaskHeaderProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === state);
  const [menuOpen, setMenuOpen] = useState(false);

  const openPanel = (panel: 'history' | 'artifacts' | 'context') => {
    setMenuOpen(false);
    onOpenPanel?.(panel);
  };

  return (
    <GlassPanel className="p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <Link
          to="/"
          aria-label="返回首页"
          className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--em-border)] px-2.5 text-xs font-semibold text-[var(--em-primary-deep)] transition hover:bg-[var(--em-primary-subtle)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">返回首页</span>
          <span className="sm:hidden">返回</span>
        </Link>
        <h1 className="text-base font-bold sm:text-lg">{task.knowledgePointName}</h1>
        <span className="hidden rounded-full border border-[var(--em-border)] bg-[var(--em-primary-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--em-primary-deep)] sm:inline">
          {ACTION_TYPE_LABEL[task.actionType]}
        </span>
        <span className="hidden rounded-full border border-[var(--em-border)] bg-[var(--em-primary-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--em-primary-deep)] lg:inline">
          预计 {task.estimatedMinutes} 分钟
        </span>

        <ol className="order-last flex w-full items-center gap-1 overflow-x-auto pb-0.5 md:order-none md:mx-1 md:w-auto md:min-w-0 md:flex-1 md:overflow-visible">
          {STEPS.map((step, index) => {
            const completed = state === 'complete' || index < currentIndex;
            const current = state !== 'complete' && index === currentIndex;
            return (
              <li key={step.id} className="flex items-center gap-1">
                <span
                  aria-current={current ? 'step' : undefined}
                  title="阶段仅反映已观察到的学习互动，不代表掌握度"
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                    completed && 'border-[var(--em-success)] bg-[var(--em-surface-subtle)] text-[var(--em-success)]',
                    current && 'border-[var(--em-primary)] bg-[var(--em-primary-subtle)] text-[var(--em-primary-deep)]',
                    !completed && !current && 'border-[var(--em-border)] bg-[var(--em-surface-subtle)] text-[var(--em-muted-ink)]',
                  )}
                >
                  {completed || current ? (
                    completed ? (
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <CircleDot className="h-3 w-3" aria-hidden="true" />
                    )
                  ) : null}
                  {step.label}
                </span>
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-px w-2 shrink-0',
                      completed ? 'bg-[var(--em-success)]' : 'bg-[var(--em-primary-subtle)]',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>

        <span className="ml-auto flex items-center gap-1.5">
          {onOpenPanel && (
            <span className="hidden items-center gap-1.5 md:flex">
              {PANEL_ENTRIES.map((entry) => {
                const Icon = entry.icon;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    title={entry.label}
                    aria-label={entry.label}
                    onClick={() => openPanel(entry.id)}
                    className={PANEL_ICON_BUTTON}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </span>
          )}
          {onOpenPanel && (
            <span className="relative md:hidden">
              <button
                type="button"
                aria-label="更多功能"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className={PANEL_ICON_BUTTON}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 z-10 w-40 rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-1.5 shadow-[var(--em-shadow-md)]">
                  {PANEL_ENTRIES.map((entry) => {
                    const Icon = entry.icon;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => openPanel(entry.id)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-[var(--em-ink)] transition hover:bg-[var(--em-primary-subtle)]"
                      >
                        <Icon className="h-3.5 w-3.5 text-[var(--em-primary)]" />
                        {entry.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </span>
          )}
          <span className="hidden rounded-full border border-[var(--em-border)] bg-[var(--em-primary-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--em-primary-deep)] lg:inline">
            任务 {task.order} / {plan.tasks.length}
          </span>
        </span>
      </div>
    </GlassPanel>
  );
}
