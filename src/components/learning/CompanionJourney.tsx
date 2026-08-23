import {
  BookOpen,
  CheckCircle2,
  CircleDot,
  Lightbulb,
  MessageSquareText,
  PenLine,
  Sparkles,
} from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';
import type { CompanionJourneyState } from './companionFlow';
import { cn } from '@/lib/utils';

export interface CompanionJourneyProps {
  state: CompanionJourneyState;
}

const STEPS = [
  { id: 'prepare', label: '准备', icon: Sparkles },
  { id: 'learning', label: '学习', icon: BookOpen },
  { id: 'thinking', label: '思考', icon: Lightbulb },
  { id: 'practice', label: '练习', icon: PenLine },
  { id: 'reflection', label: '复述', icon: MessageSquareText },
  { id: 'complete', label: '完成', icon: CheckCircle2 },
] as const;

export function CompanionJourney({ state }: CompanionJourneyProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === state);

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-primary-700">
            COMPANION JOURNEY
          </p>
          <h2 className="mt-1 text-lg font-bold">小涟正陪你走到这里</h2>
        </div>
        <p className="text-xs text-[var(--em-muted-ink)]">
          这是学习体验状态，不是 Agent 技术执行状态。
        </p>
      </div>
      <ol className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STEPS.map((step, index) => {
          const completed = state === 'complete' || index < currentIndex;
          const current = state !== 'complete' && index === currentIndex;
          const Icon = completed ? CheckCircle2 : current ? CircleDot : step.icon;

          return (
            <li
              key={step.id}
              aria-current={current ? 'step' : undefined}
              className={cn(
                'min-w-0 rounded-lg border px-2 py-3 text-center',
                completed &&
                  'border-emerald-200 bg-emerald-50/70 text-emerald-800',
                current &&
                  'border-primary-300 bg-violet-50 text-primary-800',
                !completed &&
                  !current &&
                  'border-slate-200 bg-slate-50/70 text-slate-500',
              )}
            >
              <Icon className="mx-auto h-4 w-4" aria-hidden="true" />
              <strong className="mt-1.5 block text-xs">{step.label}</strong>
            </li>
          );
        })}
      </ol>
    </GlassPanel>
  );
}
