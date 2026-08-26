import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchVoiceStatus,
  synthesizeCyreneSpeech,
  type RemoteVoiceProvider,
  type VoiceOutputProvider,
} from '@/lib/voiceApi';
import { cleanSpeechText, pickChineseVoice } from './speech';
import {
  playSpeechWithFallback,
  selectOutputProvider,
  selectVoiceMode,
  type VoiceMode,
} from './speechPlayback';

export interface SpeechSynthesisController {
  supported: boolean;
  speaking: boolean;
  mode: VoiceMode;
  provider: VoiceOutputProvider;
  error: string | null;
  speak: (text: string) => void;
  stop: () => void;
}

function browserSupportsSpeech(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  );
}

export function useSpeechSynthesis(): SpeechSynthesisController {
  const [browserSupported] = useState(browserSupportsSpeech);
  const [cyreneConfigured, setCyreneConfigured] = useState(false);
  const [remoteProvider, setRemoteProvider] =
    useState<RemoteVoiceProvider | null>(null);
  const [provider, setProvider] = useState<VoiceOutputProvider>(() =>
    browserSupportsSpeech() ? 'browser_speech' : 'unavailable',
  );
  const [mode, setMode] = useState<VoiceMode>(() =>
    selectVoiceMode(false, browserSupportsSpeech()),
  );
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
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
    const ownedUtterance = utteranceRef.current;
    utteranceRef.current = null;
    if (ownedUtterance && browserSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [browserSupported, releaseRemoteAudio]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchVoiceStatus(controller.signal)
      .then((status) => {
        setCyreneConfigured(status.configured);
        setMode(selectVoiceMode(status.configured, browserSupported));
        if (status.configured && status.provider !== 'unavailable') {
          setRemoteProvider(status.provider);
          setProvider(status.provider);
        } else {
          setRemoteProvider(null);
          setProvider(browserSupported ? 'browser_speech' : 'unavailable');
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCyreneConfigured(false);
        setRemoteProvider(null);
        setMode(selectVoiceMode(false, browserSupported));
        setProvider(browserSupported ? 'browser_speech' : 'unavailable');
        setError('无法读取昔涟语音服务状态，已按本机能力降级。');
      });
    return () => controller.abort();
  }, [browserSupported]);

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
        utteranceRef.current = null;
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

      const playBrowser = (value: string) => {
        if (!browserSupported) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(value);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.98;
        utterance.pitch = 1.04;
        const voice = pickChineseVoice(window.speechSynthesis.getVoices());
        if (voice) utterance.voice = voice;
        utterance.onend = finish;
        utterance.onerror = finish;
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };

      void playSpeechWithFallback({
        text: spokenText,
        cyreneConfigured,
        browserSupported,
        playCyrene,
        playBrowser,
      })
        .then((result) => {
          if (generation !== generationRef.current) return;
          setMode(result.mode);
          setProvider(selectOutputProvider(result.mode, remoteProvider));
          setError(result.error);
          if (result.mode === 'unavailable') setSpeaking(false);
        })
        .catch(() => {
          if (generation !== generationRef.current) return;
          setSpeaking(false);
        });
    },
    [
      browserSupported,
      cyreneConfigured,
      releaseRemoteAudio,
      remoteProvider,
      stop,
    ],
  );

  useEffect(
    () => () => {
      generationRef.current += 1;
      requestRef.current?.abort();
      releaseRemoteAudio();
      if (utteranceRef.current && browserSupported) {
        utteranceRef.current = null;
        window.speechSynthesis.cancel();
      }
    },
    [browserSupported, releaseRemoteAudio],
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
