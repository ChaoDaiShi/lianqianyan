import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchVoiceStatus,
  synthesizeCyreneSpeech,
  type VoiceOutputProvider,
} from '@/lib/voiceApi';
import { cleanSpeechText } from './speech';
import type { VoiceMode } from './speechPlayback';

export interface SpeechSynthesisController {
  supported: boolean;
  speaking: boolean;
  mode: VoiceMode;
  provider: VoiceOutputProvider;
  error: string | null;
  speak: (text: string) => void;
  stop: () => void;
}

export function useSpeechSynthesis(): SpeechSynthesisController {
  const [cyreneConfigured, setCyreneConfigured] = useState(false);
  const [provider, setProvider] = useState<VoiceOutputProvider>('unavailable');
  const [mode, setMode] = useState<VoiceMode>('unavailable');
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const releaseRemoteAudio = useCallback(() => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
    const audioUrl = audioUrlRef.current;
    audioUrlRef.current = null;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, []);

  const stop = useCallback(() => {
    generationRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    releaseRemoteAudio();
    setSpeaking(false);
  }, [releaseRemoteAudio]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchVoiceStatus(controller.signal)
      .then((status) => {
        setCyreneConfigured(status.configured);
        setMode(status.configured ? 'cyrene' : 'unavailable');
        setProvider(status.configured ? 'minimax' : 'unavailable');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCyreneConfigured(false);
        setMode('unavailable');
        setProvider('unavailable');
        setError('无法读取 MiniMax 语音服务状态。');
      });
    return () => controller.abort();
  }, []);

  const speak = useCallback(
    (text: string) => {
      const spokenText = cleanSpeechText(text);
      if (!spokenText) return;

      stop();
      const generation = generationRef.current;
      setError(null);
      setSpeaking(true);

      const finish = () => {
        if (generation !== generationRef.current) return;
        releaseRemoteAudio();
        setSpeaking(false);
      };

      const playCyrene = async (value: string) => {
        const controller = new AbortController();
        requestRef.current = controller;
        try {
          const audioBlob = await synthesizeCyreneSpeech(value, controller.signal);
          if (generation !== generationRef.current) {
            throw new DOMException('Speech request was stopped', 'AbortError');
          }
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audioUrlRef.current = audioUrl;
          audioRef.current = audio;
          audio.onended = finish;
          audio.onerror = finish;
          await audio.play();
        } catch (playbackError) {
          releaseRemoteAudio();
          throw playbackError;
        } finally {
          if (requestRef.current === controller) requestRef.current = null;
        }
      };

      if (!cyreneConfigured) {
        setSpeaking(false);
        setError('MiniMax 语音服务尚未配置。');
        return;
      }
      void playCyrene(spokenText).catch((cause: unknown) => {
          if (generation !== generationRef.current) return;
          setSpeaking(false);
          setError(cause instanceof DOMException && cause.name === 'AbortError' ? null : 'MiniMax 语音生成失败，请稍后重试。');
        });
    },
    [
      cyreneConfigured,
      releaseRemoteAudio,
      stop,
    ],
  );

  useEffect(
    () => () => {
      generationRef.current += 1;
      requestRef.current?.abort();
      releaseRemoteAudio();
    },
    [releaseRemoteAudio],
  );

  return {
    supported: mode !== 'unavailable',
    speaking,
    mode,
    provider,
    error,
    speak,
    stop,
  };
}
