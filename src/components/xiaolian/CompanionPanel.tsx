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
    <GlassPanel className={cn('space-y-4 p-4', className)}>
      <div className="flex items-start gap-3">
        <XiaolianCharacter state={state} size="sm" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--em-primary)]">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--em-ink)]">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">{message}</p>
        </div>
      </div>
      {details && <div className="border-t border-[var(--em-border)] pt-3">{details}</div>}
      {action && <div>{action}</div>}
    </GlassPanel>
  );
}
