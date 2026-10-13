import { Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cleanSpeechText } from './speech';
import type { VoiceMode } from './speechPlayback';

export interface SpeechControlsProps {
  text: string;
  supported: boolean;
  speaking: boolean;
  mode: VoiceMode;
  onSpeak: (text: string) => void;
  onStop: () => void;
  className?: string;
}

export function SpeechControls({
  text,
  supported,
  speaking,
  mode,
  onSpeak,
  onStop,
  className,
}: SpeechControlsProps) {
  const hasText = cleanSpeechText(text).length > 0;
  const available = supported && mode !== 'unavailable';
  const idleLabel = 'MiniMax 讲解';
  const actionLabel = available ? `播放${idleLabel}` : '语音讲解不可用';
  const stopLabel = '停止 MiniMax 讲解';
  const visibleLabel = speaking ? '停止讲解' : available ? '讲解' : '不可用';

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={!hasText || !available}
      aria-label={speaking ? stopLabel : actionLabel}
      title={speaking ? stopLabel : actionLabel}
      onClick={() => (speaking ? onStop() : onSpeak(text))}
      className={cn(
        'h-10 w-10 gap-0 rounded-xl border-violet-200 bg-[var(--em-surface)]/70 p-0 text-[var(--em-primary-deep)]',
        className,
      )}
    >
      {speaking ? (
        <Square className="h-3.5 w-3.5 fill-current" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      <span className="sr-only">{visibleLabel}</span>
    </Button>
  );
}
