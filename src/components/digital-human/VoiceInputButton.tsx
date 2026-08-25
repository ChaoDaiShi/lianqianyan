import { Mic, MicOff, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface VoiceInputButtonProps {
  supported: boolean;
  listening: boolean;
  interimTranscript?: string;
  error: string | null;
  disabled?: boolean;
  compact?: boolean;
  onStart: () => void;
  onStop: () => void;
  className?: string;
}

export function VoiceInputButton({
  supported,
  listening,
  interimTranscript = '',
  error,
  disabled = false,
  compact = false,
  onStart,
  onStop,
  className,
}: VoiceInputButtonProps) {
  const label = !supported
    ? '语音输入不可用'
    : listening
      ? '停止语音输入'
      : '开始语音输入';

  return (
    <div className={cn('min-w-0', className)}>
      <Button
        type="button"
        size={compact ? 'icon' : 'sm'}
        variant="outline"
        disabled={disabled || !supported}
        aria-label={label}
        title={!supported ? '当前浏览器不支持语音识别' : undefined}
        onClick={listening ? onStop : onStart}
        className={cn(
          compact
            ? 'h-9 w-9 rounded-xl'
            : 'h-9 gap-1.5 rounded-xl px-3 text-xs',
          listening
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-violet-200 bg-white/70 text-primary-700',
        )}
      >
        {!supported ? (
          <MicOff className="h-3.5 w-3.5" />
        ) : listening ? (
          <Square className="h-3 w-3 fill-current" />
        ) : (
          <Mic className="h-3.5 w-3.5" />
        )}
        {!compact && label.replace('开始', '')}
      </Button>
      {listening && interimTranscript && (
        <p className="mt-1 max-w-52 truncate text-[10px] text-rose-600" role="status">
          {interimTranscript}
        </p>
      )}
      {error && (
        <p className="mt-1 max-w-64 text-[10px] leading-4 text-amber-700" role="status">
          {error}
        </p>
      )}
    </div>
  );
}

