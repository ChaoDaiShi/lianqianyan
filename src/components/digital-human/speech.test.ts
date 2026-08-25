import { describe, expect, it } from 'vitest';
import {
  cleanSpeechText,
  pickChineseVoice,
  type SpeechVoice,
} from './speech';

function voice(name: string, lang: string): SpeechVoice {
  return {
    default: false,
    lang,
    localService: true,
    name,
    voiceURI: name,
  };
}

describe('digital-human speech helpers', () => {
  it('turns Markdown answers into concise spoken text', () => {
    expect(
      cleanSpeechText(
        '## 标题\n**互斥** `mutex` [来源](https://example.test)\n- 要点一',
      ),
    ).toBe('标题 互斥 mutex 来源 要点一');
  });

  it('removes control characters and caps one utterance at 600 characters', () => {
    expect(cleanSpeechText('甲\u0000乙\u0007丙')).toBe('甲乙丙');
    expect(cleanSpeechText('甲'.repeat(900))).toHaveLength(600);
  });

  it('honors a smaller explicit utterance limit', () => {
    expect(cleanSpeechText('一二三四五', 3)).toBe('一二三');
    expect(cleanSpeechText('一二三', 0)).toBe('');
  });

  it('prefers exact mainland Chinese and then any Chinese voice', () => {
    const english = voice('English', 'en-US');
    const traditional = voice('Traditional Chinese', 'zh-TW');
    const mainland = voice('Mainland Chinese', 'zh-CN');

    expect(pickChineseVoice([english, traditional, mainland])).toBe(mainland);
    expect(pickChineseVoice([english, traditional])).toBe(traditional);
    expect(pickChineseVoice([english])).toBeNull();
  });
});
