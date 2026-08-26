import type {
  RemoteVoiceProvider,
  VoiceOutputProvider,
} from '@/lib/voiceApi';

export type VoiceMode = 'cyrene' | 'browser_fallback' | 'unavailable';

export interface VoicePlaybackResult {
  mode: VoiceMode;
  error: string | null;
}

interface VoicePlaybackOptions {
  text: string;
  cyreneConfigured: boolean;
  browserSupported: boolean;
  playCyrene: (text: string) => Promise<void>;
  playBrowser: (text: string) => void;
}

export function selectVoiceMode(
  cyreneConfigured: boolean,
  browserSupported: boolean,
): VoiceMode {
  if (cyreneConfigured) return 'cyrene';
  return browserSupported ? 'browser_fallback' : 'unavailable';
}

export function selectOutputProvider(
  mode: VoiceMode,
  remoteProvider: RemoteVoiceProvider | null,
): VoiceOutputProvider {
  if (mode === 'cyrene') return remoteProvider ?? 'unavailable';
  if (mode === 'browser_fallback') return 'browser_speech';
  return 'unavailable';
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function playSpeechWithFallback({
  text,
  cyreneConfigured,
  browserSupported,
  playCyrene,
  playBrowser,
}: VoicePlaybackOptions): Promise<VoicePlaybackResult> {
  if (cyreneConfigured) {
    try {
      await playCyrene(text);
      return { mode: 'cyrene', error: null };
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (browserSupported) {
        playBrowser(text);
        return {
          mode: 'browser_fallback',
          error: '昔涟语音服务暂时不可用，已切换为浏览器语音。',
        };
      }
      return {
        mode: 'unavailable',
        error: '昔涟语音服务暂时不可用，且当前浏览器不支持语音输出。',
      };
    }
  }

  if (browserSupported) {
    playBrowser(text);
    return { mode: 'browser_fallback', error: null };
  }

  return {
    mode: 'unavailable',
    error: '当前浏览器与昔涟语音服务均不可用。',
  };
}
