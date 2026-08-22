import type { ReactNode } from 'react';
import type { XiaolianCharacterState } from '@/design';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianCharacter } from './XiaolianCharacter';

export interface CompanionPanelProps {
  state: XiaolianCharacterState;
  eyebrow: string;
  title: string;
  message: string;
  action?: ReactNode;
  details?: ReactNode;
  className?: string;
}

export function CompanionPanel({ state, eyebrow, title, message, action, details, className }: CompanionPanelProps) {
  return (
    <GlassPanel className={cn('overflow-hidden p-5', className)}>
      <div className="relative -mx-5 -mt-5 mb-4 overflow-hidden bg-gradient-to-b from-violet-100/70 via-sky-50/40 to-transparent px-5 pt-2">
        <div className="absolute left-5 top-8 h-16 w-16 rounded-full bg-companion/20 blur-2xl" />
        <XiaolianCharacter state={state} size="lg" className="relative" />
      </div>
      <p className="text-[10px] font-bold tracking-[0.18em] text-primary-600">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-bold text-[var(--em-ink)]">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-[var(--em-muted-ink)]">{message}</p>
      {details && <div className="mt-4 border-t border-violet-100 pt-4">{details}</div>}
      {action && <div className="mt-5">{action}</div>}
    </GlassPanel>
  );
}
