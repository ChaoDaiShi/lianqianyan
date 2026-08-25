import { Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cleanSpeechText } from './speech';

export interface SpeechControlsProps {
  text: string;
  supported: boolean;
  speaking: boolean;
  onSpeak: (text: string) => void;
  onStop: () => void;
  className?: string;
}

export function SpeechControls({
  text,
  supported,
  speaking,
  onSpeak,
  onStop,
  className,
}: SpeechControlsProps) {
  if (!supported) return null;
  const hasText = cleanSpeechText(text).length > 0;

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={!hasText}
      aria-label={speaking ? '停止数字人讲解' : '播放数字人讲解'}
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
      {speaking ? '停止讲解' : '数字人讲解'}
    </Button>
  );
}
