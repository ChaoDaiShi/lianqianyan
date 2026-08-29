import { useState, type ReactNode } from 'react';
import { ArrowLeft, CheckCircle2, CircleDot, FileText, History, Info, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PersistedStudyPlan, PersistedStudyTask } from '@/domain';
import { ACTION_TYPE_LABEL } from '@/domain';
import { GlassPanel } from '@/components/design/GlassPanel';
import type { CompanionJourneyState } from './companionFlow';
import type { CaptchaProvider } from '@/auth/authApi';
import { cn } from '@/lib/utils';

interface WorkbenchTaskHeaderProps {
  plan: PersistedStudyPlan;
  task: PersistedStudyTask;
  state: CompanionJourneyState;
  /** 打开某个抽屉（历史/产物/上下文）。 */
  onOpenPanel?(panel: 'history' | 'artifacts' | 'context'): void;
  /** 保留给旧调用方的扩展位。 */
  actions?: ReactNode;
  /** 仅用于类型完整性；CaptchaProvider 不在 Header 中使用。 */
  _providerHint?: CaptchaProvider;
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
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-violet-200/70 text-primary-700 transition hover:bg-violet-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7766E8]';

export function WorkbenchTaskHeader({ plan, task, state, onOpenPanel, actions }: WorkbenchTaskHeaderProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === state);
  const [menuOpen, setMenuOpen] = useState(false);

  const openPanel = (panel: 'history' | 'artifacts' | 'context') => {
    setMenuOpen(false);
    onOpenPanel?.(panel);
  };

  return (
    <GlassPanel className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 rounded-full border border-violet-200/70 px-3 py-1 text-xs font-semibold text-primary-700 transition hover:bg-violet-50/60"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回首页
        </Link>
        <h1 className="text-lg font-bold">{task.knowledgePointName}</h1>
        <span className="hidden rounded-full border border-violet-100 bg-violet-50/70 px-2.5 py-0.5 text-xs font-semibold text-primary-700 sm:inline">
          {ACTION_TYPE_LABEL[task.actionType]}
        </span>
        <span className="hidden rounded-full border border-violet-100 bg-violet-50/70 px-2.5 py-0.5 text-xs font-semibold text-primary-700 sm:inline">
          预计 {task.estimatedMinutes} 分钟
        </span>
        <span className="ml-auto flex items-center gap-2">
          {actions}
          {/* 桌面端：icon + tooltip */}
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
          {/* 移动端：··· 菜单 */}
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
                <div className="absolute right-0 top-10 z-10 w-40 rounded-2xl border border-violet-100 bg-[var(--em-surface)] p-1.5 shadow-xl">
                  {PANEL_ENTRIES.map((entry) => {
                    const Icon = entry.icon;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => openPanel(entry.id)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-[var(--em-ink)] transition hover:bg-violet-50/60"
                      >
                        <Icon className="h-3.5 w-3.5 text-primary-600" />
                        {entry.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </span>
          )}
          <span className="hidden rounded-full border border-primary-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-primary-700 sm:inline">
            任务 {task.order} / {plan.tasks.length}
          </span>
        </span>
      </div>
      <ol className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {STEPS.map((step, index) => {
          const completed = state === 'complete' || index < currentIndex;
          const current = state !== 'complete' && index === currentIndex;
          return (
            <li key={step.id} className="flex items-center gap-1.5">
              <span
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                  completed && 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
                  current && 'border-primary-300 bg-violet-50 text-primary-800',
                  !completed && !current && 'border-slate-200 bg-slate-50/70 text-slate-500',
                )}
              >
                {completed || current ? (
                  completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
                  )
                ) : null}
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-px w-3 shrink-0',
                    completed ? 'bg-emerald-300/80' : 'bg-violet-200/60',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2.5 text-[11px] leading-4 text-[var(--em-muted-ink)]">
        阶段仅反映已观察到的学习互动，不表示掌握度或回答正确性；任务序号只表示计划中的位置。
      </p>
    </GlassPanel>
  );
}
