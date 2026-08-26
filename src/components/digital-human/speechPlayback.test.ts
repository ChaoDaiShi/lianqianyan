import { describe, expect, it, vi } from 'vitest';
import {
  playSpeechWithFallback,
  selectOutputProvider,
  selectVoiceMode,
} from './speechPlayback';

describe('selectVoiceMode', () => {
  it.each([
    [true, true, 'cyrene'],
    [true, false, 'cyrene'],
    [false, true, 'browser_fallback'],
    [false, false, 'unavailable'],
  ] as const)(
    'maps configured=%s browser=%s to %s',
    (configured, browserSupported, expected) => {
      expect(selectVoiceMode(configured, browserSupported)).toBe(expected);
    },
  );
});

describe('selectOutputProvider', () => {
  it.each([
    ['cyrene', 'genie_tts', 'genie_tts'],
    ['cyrene', 'gpt_sovits', 'gpt_sovits'],
    ['cyrene', null, 'unavailable'],
    ['browser_fallback', 'genie_tts', 'browser_speech'],
    ['unavailable', 'genie_tts', 'unavailable'],
  ] as const)('maps mode=%s remote=%s to %s', (mode, remote, expected) => {
    expect(selectOutputProvider(mode, remote)).toBe(expected);
  });
});

describe('playSpeechWithFallback', () => {
  it('uses Cyrene synthesis first when the service is configured', async () => {
    const playCyrene = vi.fn().mockResolvedValue(undefined);
    const playBrowser = vi.fn();

    await expect(
      playSpeechWithFallback({
        text: '解释死锁',
        cyreneConfigured: true,
        browserSupported: true,
        playCyrene,
        playBrowser,
      }),
    ).resolves.toEqual({ mode: 'cyrene', error: null });
    expect(playCyrene).toHaveBeenCalledWith('解释死锁');
    expect(playBrowser).not.toHaveBeenCalled();
  });

  it('explicitly falls back to browser speech after a service failure', async () => {
    const playBrowser = vi.fn();

    await expect(
      playSpeechWithFallback({
        text: '解释死锁',
        cyreneConfigured: true,
        browserSupported: true,
        playCyrene: vi.fn().mockRejectedValue(new Error('private upstream detail')),
        playBrowser,
      }),
    ).resolves.toEqual({
      mode: 'browser_fallback',
      error: '昔涟语音服务暂时不可用，已切换为浏览器语音。',
    });
    expect(playBrowser).toHaveBeenCalledWith('解释死锁');
  });

  it('reports unavailability instead of pretending browser speech is Cyrene', async () => {
    await expect(
      playSpeechWithFallback({
        text: '解释死锁',
        cyreneConfigured: false,
        browserSupported: false,
        playCyrene: vi.fn(),
        playBrowser: vi.fn(),
      }),
    ).resolves.toEqual({
      mode: 'unavailable',
      error: '当前浏览器与昔涟语音服务均不可用。',
    });
  });
});
