import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, MoonStar } from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';

export function LearningState({
  kind,
  title,
  description,
  action,
}: {
  kind: 'loading' | 'error' | 'empty';
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <GlassPanel className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
      {kind === 'loading' ? (
        <>
          <XiaolianCharacter state="thinking" size="md" />
          <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary-500" />
        </>
      ) : kind === 'error' ? (
        <AlertTriangle className="h-9 w-9 text-amber-500" />
      ) : (
        <>
          <XiaolianCharacter state="idle" size="md" />
          <MoonStar className="mt-3 h-6 w-6 text-primary-400" />
        </>
      )}
      <h2 className="mt-4 text-lg font-bold text-[var(--em-ink)]">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--em-muted-ink)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </GlassPanel>
  );
}
