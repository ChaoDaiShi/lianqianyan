export const DEFAULT_SPEECH_LIMIT = 600;

export interface SpeechVoice {
  default: boolean;
  lang: string;
  localService: boolean;
  name: string;
  voiceURI: string;
}

function stripControlCharacters(text: string): string {
  return Array.from(text)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
}

/** Prepare Tutor Markdown for a short browser speech utterance. */
export function cleanSpeechText(
  text: string,
  maxLength = DEFAULT_SPEECH_LIMIT,
): string {
  const safeLimit = Math.max(0, Math.floor(maxLength));
  if (safeLimit === 0) return '';

  const normalized = stripControlCharacters(
    text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim(),
  );

  return normalized.slice(0, safeLimit).trim();
}

export function pickChineseVoice(
  voices: readonly SpeechVoice[],
): SpeechVoice | null {
  const exact = voices.find(
    (voice) => voice.lang.toLowerCase().replace('_', '-') === 'zh-cn',
  );
  if (exact) return exact;
  return (
    voices.find((voice) =>
      voice.lang.toLowerCase().replace('_', '-').startsWith('zh-'),
    ) ?? null
  );
}
