import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlarmClock, ArrowLeft, CheckCircle2, Cloud, CloudOff, Send } from 'lucide-react';
import type {
  ExamAnswerValue,
  ExamAttempt,
  ExamAttemptQuestion,
  ExamAttemptSummary,
} from '@/domain';
import { saveExamAnswer, submitExamAttempt } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GlassPanel } from '@/components/design/GlassPanel';
import { SpeechControls } from '@/components/digital-human/SpeechControls';
import { VoiceAttributionNotice } from '@/components/digital-human/VoiceAttributionNotice';
import { VoiceInputButton } from '@/components/digital-human/VoiceInputButton';
import { useSpeechRecognition } from '@/components/digital-human/useSpeechRecognition';
import { useSpeechSynthesis } from '@/components/digital-human/useSpeechSynthesis';
import {
  answerIsComplete,
  shouldSyncAnswersBeforeSubmit,
} from './examPresentation';

interface ExamRunnerProps {
  attempt: ExamAttempt;
  onSubmitted: (summary: ExamAttemptSummary) => void;
  onExit: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function parseServerInstant(value: string): number {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return Date.parse(hasZone ? value : `${value}Z`);
}

function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function QuestionAnswer({
  question,
  value,
  onChange,
  voice,
  onVoiceStart,
}: {
  question: ExamAttemptQuestion;
  value: ExamAnswerValue;
  onChange: (value: ExamAnswerValue) => void;
  voice: ReturnType<typeof useSpeechRecognition>;
  onVoiceStart: () => void;
}) {
  if (question.responseKind === 'single_choice') {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-3 rounded-[16px] border border-violet-100 bg-white/55 p-3 text-sm hover:border-primary-200">
            <input
              type="radio"
              name={`question-${question.questionId}`}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="accent-violet-600"
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (question.responseKind === 'multiple_choice') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-3 rounded-[16px] border border-violet-100 bg-white/55 p-3 text-sm hover:border-primary-200">
            <input
              type="checkbox"
              value={option}
              checked={selected.includes(option)}
              onChange={(event) => onChange(
                event.target.checked
                  ? [...selected, option]
                  : selected.filter((item) => item !== option),
              )}
              className="accent-violet-600"
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (question.responseKind === 'boolean') {
    return (
      <div className="flex gap-3">
        {[
          { label: '正确', answer: true },
          { label: '错误', answer: false },
        ].map((item) => (
          <label key={item.label} className="flex min-w-28 cursor-pointer items-center gap-3 rounded-[16px] border border-violet-100 bg-white/55 p-3 text-sm">
            <input
              type="radio"
              name={`question-${question.questionId}`}
              checked={value === item.answer}
              onChange={() => onChange(item.answer)}
              className="accent-violet-600"
            />
            {item.label}
          </label>
        ))}
      </div>
    );
  }

  return (
    <div>
      <Textarea
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        rows={question.responseKind === 'long_text' ? 6 : 3}
        maxLength={8_000}
        placeholder="在这里作答；停止输入约 700ms 后自动保存"
        className="rounded-[18px] border-violet-100 bg-white/65 leading-6"
      />
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <VoiceInputButton
          supported={voice.supported}
          listening={voice.listening}
          interimTranscript={voice.interimTranscript}
          error={voice.error}
          onStart={onVoiceStart}
          onStop={voice.stop}
        />
        <span className="text-[10px] text-[var(--em-muted-ink)]">
          语音只填入当前答案，确认文字后再交卷
        </span>
      </div>
    </div>
  );
}

export function ExamRunner({ attempt, onSubmitted, onExit }: ExamRunnerProps) {
  const [answers, setAnswers] = useState<Record<string, ExamAnswerValue>>(() =>
    Object.fromEntries(
      attempt.questions.map((question) => [question.questionId, question.userAnswer]),
    ),
  );
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [now, setNow] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [voiceQuestionId, setVoiceQuestionId] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const expiredSubmissionStarted = useRef(false);
  const speech = useSpeechSynthesis();
  const voice = useSpeechRecognition({
    onFinalTranscript: (transcript) => {
      if (!voiceQuestionId) return;
      const current = answers[voiceQuestionId];
      const merged = [typeof current === 'string' ? current.trim() : '', transcript]
        .filter(Boolean)
        .join(' ');
      updateAnswer(voiceQuestionId, merged);
    },
  });

  const commitAnswer = useCallback(
    async (questionId: string, value: ExamAnswerValue): Promise<boolean> => {
      setSaveStatus((current) => ({ ...current, [questionId]: 'saving' }));
      try {
        await saveExamAnswer(
          attempt.id,
          questionId,
          attempt.learnerId,
          value,
        );
        setSaveStatus((current) => ({ ...current, [questionId]: 'saved' }));
        return true;
      } catch {
        setSaveStatus((current) => ({ ...current, [questionId]: 'error' }));
        return false;
      }
    },
    [attempt.id, attempt.learnerId],
  );

  const updateAnswer = useCallback(
    (questionId: string, value: ExamAnswerValue) => {
      setAnswers((current) => ({ ...current, [questionId]: value }));
      setSaveStatus((current) => ({ ...current, [questionId]: 'saving' }));
      clearTimeout(saveTimers.current[questionId]);
      saveTimers.current[questionId] = setTimeout(() => {
        void commitAnswer(questionId, value);
      }, 700);
    },
    [commitAnswer],
  );

  const handleSubmit = useCallback(async (syncAnswers: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    Object.values(saveTimers.current).forEach(clearTimeout);
    saveTimers.current = {};
    if (syncAnswers) {
      const saved = await Promise.all(
        Object.entries(answers).map(([questionId, value]) =>
          commitAnswer(questionId, value),
        ),
      );
      if (saved.some((success) => !success)) {
        setSubmitError(true);
        setSubmitting(false);
        return;
      }
    }
    try {
      const summary = await submitExamAttempt(attempt.id, attempt.learnerId);
      onSubmitted(summary);
    } catch {
      setSubmitError(true);
      setSubmitting(false);
    }
  }, [answers, attempt.id, attempt.learnerId, commitAnswer, onSubmitted, submitting]);

  const expiresAt = useMemo(() => parseServerInstant(attempt.expiresAt), [attempt.expiresAt]);
  const remaining = expiresAt - now;
  const answeredCount = attempt.questions.filter((question) =>
    answerIsComplete(answers[question.questionId] ?? null),
  ).length;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (
      remaining <= 0 &&
      !submitting &&
      !expiredSubmissionStarted.current
    ) {
      expiredSubmissionStarted.current = true;
      void handleSubmit(false);
    }
  }, [handleSubmit, remaining, submitting]);
  useEffect(
    () => () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
    },
    [],
  );

  return (
    <div className="space-y-5">
      <GlassPanel className="sticky top-20 z-20 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-primary-600">ACTIVE EXAM</p>
            <h2 className="mt-1 text-xl font-bold">{attempt.examTitle}</h2>
            <p className="mt-1 text-xs text-[var(--em-muted-ink)]">
              已答 {answeredCount}/{attempt.questions.length} · 自动保存以服务端返回为准
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl px-4 py-2 text-center ${remaining <= 5 * 60_000 ? 'bg-rose-50 text-rose-700' : 'bg-violet-50 text-primary-700'}`}>
              <p className="flex items-center gap-1 text-[10px]"><AlarmClock className="h-3 w-3" />剩余时间</p>
              <strong className="font-mono text-lg">{formatRemaining(remaining)}</strong>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onExit} className="gap-1.5 rounded-xl">
              <ArrowLeft className="h-3.5 w-3.5" />暂时离开
            </Button>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-[var(--em-muted-ink)]">
          服务端截止时间：{new Date(expiresAt).toLocaleString('zh-CN')}。页面倒计时仅作提示，刷新后可继续未过期作答。
        </p>
        <VoiceAttributionNotice mode={speech.mode} provider={speech.provider} error={speech.error} className="mt-3" />
      </GlassPanel>

      {attempt.questions.map((question) => {
        const status = saveStatus[question.questionId] ?? (question.savedAt ? 'saved' : 'idle');
        return (
          <GlassPanel key={question.questionId} className="p-5 sm:p-6">
            <fieldset>
              <legend className="w-full">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-primary-600">
                      第 {question.position} 题 · {question.questionTypeName} · {question.points} 分
                    </p>
                    <h3 className="mt-2 text-base font-bold leading-7">{question.prompt}</h3>
                  </div>
                  <SpeechControls
                    text={question.prompt}
                    supported={speech.supported}
                    speaking={speech.speaking}
                    mode={speech.mode}
                    onSpeak={speech.speak}
                    onStop={speech.stop}
                  />
                </div>
              </legend>
              <div className="mt-4">
                <QuestionAnswer
                  question={question}
                  value={answers[question.questionId] ?? null}
                  onChange={(value) => updateAnswer(question.questionId, value)}
                  voice={voice}
                  onVoiceStart={() => {
                    speech.stop();
                    setVoiceQuestionId(question.questionId);
                    voice.start();
                  }}
                />
              </div>
            </fieldset>
            <div className="mt-3 flex items-center justify-end gap-1 text-[10px]">
              {status === 'saving' && <><Cloud className="h-3 w-3 animate-pulse" /><span>自动保存中…</span></>}
              {status === 'saved' && <><CheckCircle2 className="h-3 w-3 text-emerald-500" /><span>已保存</span></>}
              {status === 'error' && <><CloudOff className="h-3 w-3 text-rose-500" /><span className="text-rose-700">保存失败，交卷前会重试</span></>}
              {status === 'idle' && <span className="text-[var(--em-muted-ink)]">作答后自动保存</span>}
            </div>
          </GlassPanel>
        );
      })}

      <GlassPanel className="flex flex-col items-center justify-between gap-4 p-5 sm:flex-row">
        <div>
          <p className="font-semibold">交卷前请确认所有答案</p>
          <p className="mt-1 text-xs text-[var(--em-muted-ink)]">
            客观题立即评分，人工题显示待批；交卷后不能修改。
          </p>
          {submitError && <p className="mt-2 text-xs text-rose-700" role="alert">保存或交卷失败，请检查连接后重试。</p>}
        </div>
        <Button
          type="button"
          onClick={() => void handleSubmit(shouldSyncAnswersBeforeSubmit(remaining))}
          disabled={submitting}
          className="gap-2 rounded-2xl bg-primary-500 px-6"
        >
          <Send className="h-4 w-4" />{submitting ? '正在交卷…' : '交卷'}
        </Button>
      </GlassPanel>
    </div>
  );
}
