import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from './api';
import { fetchVoiceStatus, synthesizeCyreneSpeech } from './voiceApi';

const getMock = vi.mocked(api.get);
const postMock = vi.mocked(api.post);

describe('voice API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps the deployment-owned GPT-SoVITS status', async () => {
    getMock.mockResolvedValue({
      data: {
        provider: 'gpt_sovits',
        voice: 'cyrene',
        configured: true,
        fallback: 'browser_speech',
        attribution: 'required attribution',
      },
    } as never);

    await expect(fetchVoiceStatus()).resolves.toEqual({
      provider: 'gpt_sovits',
      voice: 'cyrene',
      configured: true,
      fallback: 'browser_speech',
      attribution: 'required attribution',
    });
    expect(getMock).toHaveBeenCalledWith('/api/voice/status', {
      signal: undefined,
    });
  });

  it('maps the local Genie-TTS sidecar status', async () => {
    getMock.mockResolvedValue({
      data: {
        provider: 'genie_tts',
        voice: 'cyrene',
        configured: true,
        fallback: 'browser_speech',
        attribution: 'required attribution',
      },
    } as never);

    await expect(fetchVoiceStatus()).resolves.toMatchObject({
      provider: 'genie_tts',
      configured: true,
    });
  });

  it('requests a WAV blob without sending reference paths to the browser', async () => {
    const signal = new AbortController().signal;
    const wav = new Blob(['RIFF-test'], { type: 'audio/wav' });
    postMock.mockResolvedValue({ data: wav } as never);

    await expect(synthesizeCyreneSpeech('解释死锁', signal)).resolves.toBe(wav);
    expect(postMock).toHaveBeenCalledWith(
      '/api/voice/synthesize',
      { text: '解释死锁' },
      { responseType: 'blob', signal },
    );
  });
});
