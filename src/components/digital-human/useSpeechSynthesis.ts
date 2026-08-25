import { useCallback, useEffect, useRef, useState } from 'react';
import { cleanSpeechText, pickChineseVoice } from './speech';

export interface SpeechSynthesisController {
  supported: boolean;
  speaking: boolean;
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
  const [supported] = useState(browserSupportsSpeech);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (!supported) return;
    const ownedUtterance = utteranceRef.current;
    utteranceRef.current = null;
    if (ownedUtterance) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      const spokenText = cleanSpeechText(text);
      if (!spokenText) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.98;
      utterance.pitch = 1.04;
      const voice = pickChineseVoice(window.speechSynthesis.getVoices());
      if (voice) utterance.voice = voice;

      const finish = () => {
        if (utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        setSpeaking(false);
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      utteranceRef.current = utterance;
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  useEffect(
    () => () => {
      if (!utteranceRef.current || !supported) return;
      utteranceRef.current = null;
      window.speechSynthesis.cancel();
    },
    [supported],
  );

  return { supported, speaking, speak, stop };
}
