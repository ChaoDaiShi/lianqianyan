import { describe, expect, it, vi } from 'vitest';
import {
  collectRecognitionTranscript,
  getSpeechRecognitionConstructor,
  speechRecognitionErrorMessage,
  type SpeechRecognitionConstructor,
  type SpeechRecognitionResultEventLike,
} from './speechRecognition';

function constructorStub(): SpeechRecognitionConstructor {
  return vi.fn() as unknown as SpeechRecognitionConstructor;
}

describe('speech recognition browser adapter', () => {
  it('prefers the standard constructor and falls back to the prefixed one', () => {
    const standard = constructorStub();
    const prefixed = constructorStub();

    expect(
      getSpeechRecognitionConstructor({
        SpeechRecognition: standard,
        webkitSpeechRecognition: prefixed,
      }),
    ).toBe(standard);
    expect(
      getSpeechRecognitionConstructor({ webkitSpeechRecognition: prefixed }),
    ).toBe(prefixed);
    expect(getSpeechRecognitionConstructor({})).toBeNull();
  });

  it('separates final and interim transcript chunks from resultIndex', () => {
    const event = {
      resultIndex: 1,
      results: [
        Object.assign([{ transcript: '旧结果' }], { isFinal: true }),
        Object.assign([{ transcript: ' 死锁需要' }], { isFinal: true }),
        Object.assign([{ transcript: ' 四个条件 ' }], { isFinal: false }),
      ],
    } as unknown as SpeechRecognitionResultEventLike;

    expect(collectRecognitionTranscript(event)).toEqual({
      finalTranscript: '死锁需要',
      interimTranscript: '四个条件',
    });
  });

  it('maps permission, silence, network and generic errors to honest messages', () => {
    expect(speechRecognitionErrorMessage('not-allowed')).toContain('麦克风权限');
    expect(speechRecognitionErrorMessage('no-speech')).toContain('没有识别到');
    expect(speechRecognitionErrorMessage('network')).toContain('浏览器语音服务');
    expect(speechRecognitionErrorMessage('audio-capture')).toContain('麦克风');
    expect(speechRecognitionErrorMessage('unknown')).toContain('暂时无法');
  });
});

