import { AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoiceMode } from './speechPlayback';
import type { VoiceOutputProvider } from '@/lib/voiceApi';

interface VoiceAttributionNoticeProps {
  mode: VoiceMode;
  provider: VoiceOutputProvider;
  error: string | null;
  className?: string;
}

export function VoiceAttributionNotice({
  mode,
  provider,
  error,
  className,
}: VoiceAttributionNoticeProps) {
  const label = mode === 'cyrene' && provider === 'minimax'
    ? '当前输出：MiniMax 云端语音'
    : '当前输出：语音讲解不可用';

  return (
    <div
      className={cn(
        'rounded-xl border border-violet-100 bg-violet-50/45 px-3 py-2 text-[10px] leading-5 text-[var(--em-muted-ink)]',
        className,
      )}
      aria-label="语音技术来源"
    >
      <p className="flex items-center gap-1.5 font-semibold text-[var(--em-primary-deep)]">
        <AudioLines className="h-3 w-3" />
        {label}
      </p>
      {error && (
        <p className="text-amber-700" role="status">
          {error}
        </p>
      )}
      <p>回答文字仅在播放时发送到部署方配置的 MiniMax 服务。</p>
    </div>
  );
}
