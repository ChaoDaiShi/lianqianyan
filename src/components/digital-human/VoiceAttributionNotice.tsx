import { AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoiceMode } from './speechPlayback';
import { VOICE_ATTRIBUTION } from './voiceAttribution';
import type { VoiceOutputProvider } from '@/lib/voiceApi';

const MODE_LABELS: Record<Exclude<VoiceMode, 'cyrene'>, string> = {
  browser_fallback: '当前输出：浏览器语音（非昔涟音色）',
  unavailable: '当前输出：语音讲解不可用',
};

const CYRENE_PROVIDER_LABELS: Record<'genie_tts' | 'gpt_sovits', string> = {
  genie_tts: '当前输出：昔涟 Genie-TTS',
  gpt_sovits: '当前输出：昔涟 GPT-SoVITS',
};

export const GENIE_TTS_NOTICE =
  '推理运行时：Genie-TTS 2.0.2，Copyright (c) 2025 High_Logic，MIT License';

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
  const label =
    mode === 'cyrene' &&
    (provider === 'genie_tts' || provider === 'gpt_sovits')
      ? CYRENE_PROVIDER_LABELS[provider]
      : mode === 'cyrene'
        ? '当前输出：昔涟语音服务'
        : MODE_LABELS[mode];

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
        {label}
      </p>
      {error && (
        <p className="text-amber-700" role="status">
          {error}
        </p>
      )}
      <p>语音技术来源：{VOICE_ATTRIBUTION}</p>
      {mode === 'cyrene' && provider === 'genie_tts' && (
        <p>{GENIE_TTS_NOTICE}</p>
      )}
    </div>
  );
}
