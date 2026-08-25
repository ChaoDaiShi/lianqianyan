import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collectRecognitionTranscript,
  getSpeechRecognitionConstructor,
  speechRecognitionErrorMessage,
  type SpeechRecognitionLike,
  type SpeechRecognitionScope,
} from './speechRecognition';

export interface SpeechRecognitionController {
  supported: boolean;
  listening: boolean;
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  resetError: () => void;
}

export interface UseSpeechRecognitionOptions {
  language?: string;
  onFinalTranscript: (transcript: string) => void;
}

function browserScope(): SpeechRecognitionScope | null {
  return typeof window === 'undefined'
    ? null
    : (window as unknown as SpeechRecognitionScope);
}

export function useSpeechRecognition({
  language = 'zh-CN',
  onFinalTranscript,
}: UseSpeechRecognitionOptions): SpeechRecognitionController {
  const [supported] = useState(
    () => getSpeechRecognitionConstructor(browserScope()) !== null,
  );
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  onFinalTranscriptRef.current = onFinalTranscript;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Constructor = getSpeechRecognitionConstructor(browserScope());
    if (!Constructor || recognitionRef.current) return;
    setError(null);
    setInterimTranscript('');
    const recognition = new Constructor();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const transcript = collectRecognitionTranscript(event);
      setInterimTranscript(transcript.interimTranscript);
      if (transcript.finalTranscript) {
        onFinalTranscriptRef.current(transcript.finalTranscript);
      }
    };
    recognition.onerror = (event) => {
      const message = speechRecognitionErrorMessage(event.error);
      setError(message || null);
      setListening(false);
      setInterimTranscript('');
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setListening(false);
      setInterimTranscript('');
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setError('语音输入启动失败，请稍后重试。');
    }
  }, [language]);

  const resetError = useCallback(() => setError(null), []);

  useEffect(
    () => () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) recognition.abort();
    },
    [],
  );

  return {
    supported,
    listening,
    interimTranscript,
    error,
    start,
    stop,
    resetError,
  };
}

