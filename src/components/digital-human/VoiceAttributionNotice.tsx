import { AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoiceMode } from './speechPlayback';
import { VOICE_ATTRIBUTION } from './voiceAttribution';

const MODE_LABELS: Record<VoiceMode, string> = {
  cyrene: '当前输出：昔涟 GPT-SoVITS',
  browser_fallback: '当前输出：浏览器语音（非昔涟音色）',
  unavailable: '当前输出：语音讲解不可用',
};

interface VoiceAttributionNoticeProps {
  mode: VoiceMode;
  error: string | null;
  className?: string;
}

export function VoiceAttributionNotice({
  mode,
  error,
  className,
}: VoiceAttributionNoticeProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-violet-100 bg-violet-50/45 px-3 py-2 text-[10px] leading-5 text-[var(--em-muted-ink)]',
        className,
      )}
      aria-label="语音技术来源"
    >
      <p className="flex items-center gap-1.5 font-semibold text-primary-700">
        <AudioLines className="h-3 w-3" />
        {MODE_LABELS[mode]}
      </p>
      {error && (
        <p className="text-amber-700" role="status">
          {error}
        </p>
      )}
      <p>语音技术来源：{VOICE_ATTRIBUTION}</p>
    </div>
  );
}
