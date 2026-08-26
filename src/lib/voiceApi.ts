import { api } from './api';

export interface VoiceServiceStatus {
  provider: 'gpt_sovits' | 'unavailable';
  voice: 'cyrene';
  configured: boolean;
  fallback: 'browser_speech';
  attribution: string;
}

export async function fetchVoiceStatus(
  signal?: AbortSignal,
): Promise<VoiceServiceStatus> {
  const response = await api.get<VoiceServiceStatus>('/api/voice/status', {
    signal,
  });
  return response.data;
}

export async function synthesizeCyreneSpeech(
  text: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await api.post<Blob>(
    '/api/voice/synthesize',
    { text },
    { responseType: 'blob', signal },
  );
  return response.data;
}
