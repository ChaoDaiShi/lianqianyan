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
  const idleLabel = mode === 'cyrene' ? '昔涟讲解' : '浏览器讲解';
  const actionLabel = available ? `播放${idleLabel}` : '语音讲解不可用';
  const stopLabel =
    mode === 'cyrene' ? '停止讲解 · 昔涟讲解' : '停止讲解 · 浏览器讲解';

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={!hasText || !available}
      aria-label={speaking ? stopLabel : actionLabel}
      onClick={() => (speaking ? onStop() : onSpeak(text))}
      className={cn(
        'h-8 gap-1.5 rounded-xl border-violet-200 bg-white/70 px-2.5 text-[11px] text-primary-700',
        className,
      )}
    >
      {speaking ? (
        <Square className="h-3 w-3 fill-current" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
      {speaking ? stopLabel : available ? idleLabel : '语音讲解不可用'}
    </Button>
  );
}
