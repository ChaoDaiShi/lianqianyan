export interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface SpeechRecognitionScope {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function getSpeechRecognitionConstructor(
  scope: SpeechRecognitionScope | null | undefined,
): SpeechRecognitionConstructor | null {
  return scope?.SpeechRecognition ?? scope?.webkitSpeechRecognition ?? null;
}

export function collectRecognitionTranscript(
  event: SpeechRecognitionResultEventLike,
): { finalTranscript: string; interimTranscript: string } {
  const finalParts: string[] = [];
  const interimParts: string[] = [];
  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const transcript = result?.[0]?.transcript?.trim();
    if (!transcript) continue;
    (result.isFinal ? finalParts : interimParts).push(transcript);
  }
  return {
    finalTranscript: finalParts.join(' ').trim(),
    interimTranscript: interimParts.join(' ').trim(),
  };
}

export function speechRecognitionErrorMessage(error: string): string {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    return '未获得麦克风权限，请在浏览器设置中允许后重试。';
  }
  if (error === 'no-speech') return '没有识别到语音，请靠近麦克风后重试。';
  if (error === 'audio-capture') return '没有可用的麦克风，请检查系统音频输入。';
  if (error === 'network') return '浏览器语音服务暂时不可用，请检查网络后重试。';
  if (error === 'aborted') return '';
  return '语音输入暂时无法使用，请稍后重试。';
}

