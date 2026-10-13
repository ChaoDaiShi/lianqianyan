import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  evaluatePractice,
  fetchPracticeQuestions,
  type PracticeEvaluationResponse,
  type PracticeQuestion,
} from '@/lib/educationApi';
import { ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID } from '@/store';
import { cn } from '@/lib/utils';

type ResultState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'done';
      correct: boolean;
      score: number;
      feedback: string;
      alreadyRecorded: boolean;
      data?: PracticeEvaluationResponse;
    }
  | { status: 'error'; message: string };

function resultForQuestion(question: PracticeQuestion | undefined): ResultState {
  const recorded = question?.recordedResult;
  return recorded
    ? {
        status: 'done',
        correct: recorded.isCorrect,
        score: recorded.score,
        feedback: recorded.feedback,
        alreadyRecorded: true,
      }
    : { status: 'idle' };
}

/** PV 操作快速练习：题目与服务端评分来自同一版本化练习目录。 */
export function PracticeCard() {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState>({ status: 'idle' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchPracticeQuestions({
      learnerId: ACTIVE_LEARNER_ID,
      courseId: ACTIVE_COURSE_ID,
      knowledgePointId: 'kp-pv',
    }).then((catalog) => {
      if (!active) return;
      setQuestions(catalog.questions);
      setSelected(catalog.questions[0]?.recordedResult?.optionId ?? null);
      setResult(resultForQuestion(catalog.questions[0]));
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setLoadError(true);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const question = questions[questionIndex];
  const alreadyRecorded = question?.recordedResult !== null && question?.recordedResult !== undefined;

  const submit = async () => {
    if (selected === null || !question || result.status === 'loading' || result.status === 'done') return;
    setResult({ status: 'loading' });
    try {
      const data = await evaluatePractice({
        learnerId: ACTIVE_LEARNER_ID,
        courseId: ACTIVE_COURSE_ID,
        knowledgePointId: question.knowledgePointId,
        questionId: question.id,
        optionId: selected,
      });
      const correct = data.isCorrect ?? false;
      const score = data.score ?? (correct ? 1 : 0);
      const feedback = data.feedback ?? '服务端已记录本次作答。';
      setQuestions((current) => current.map((item) => item.id === question.id
        ? { ...item, recordedResult: { optionId: selected, isCorrect: correct, score, feedback } }
        : item));
      setResult({
        status: 'done',
        correct,
        score,
        feedback,
        alreadyRecorded: data.alreadyRecorded ?? false,
        data,
      });
    } catch {
      setResult({ status: 'error', message: '暂时没能记录这次练习结果，请稍后再试。' });
    }
  };

  const nextQuestion = () => {
    const nextIndex = questionIndex + 1;
    const next = questions[nextIndex];
    if (!next) return;
    setQuestionIndex(nextIndex);
    setSelected(next.recordedResult?.optionId ?? null);
    setResult(resultForQuestion(next));
  };

  return (
    <div className="rounded-2xl border border-[var(--em-border)] bg-[var(--em-surface)] p-6 shadow-[var(--em-shadow-sm)]">
      <div className="flex items-center gap-2">
        <FileQuestion className="h-4 w-4 text-blue-600" />
        <h2 className="text-lg font-bold text-[var(--em-ink)]">PV 操作 · 快速练习</h2>
      </div>

      {loading && <p className="mt-4 flex items-center gap-2 text-sm text-[var(--em-muted-ink)]"><Loader2 className="h-4 w-4 animate-spin" />正在读取 PV 练习题…</p>}
      {loadError && <p role="alert" className="mt-4 text-sm text-red-600">练习题暂时无法读取，请稍后重试。</p>}
      {!loading && !loadError && !question && <p className="mt-4 text-sm text-[var(--em-muted-ink)]">当前知识点暂未配置可用练习题。</p>}

      {!loading && !loadError && question && <>
        <div className="mt-3 flex items-start justify-between gap-3">
          <p className="text-sm text-[var(--em-ink)]">{question.prompt}</p>
          <span className="shrink-0 rounded-full bg-[var(--em-surface-subtle)] px-2 py-0.5 text-xs text-[var(--em-muted-ink)]">{questionIndex + 1} / {questions.length}</span>
        </div>

        <div className="mt-4 space-y-2">
          {question.options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected === option.id}
              disabled={result.status === 'loading' || alreadyRecorded || result.status === 'done'}
              onClick={() => setSelected(option.id)}
              className={cn(
                'flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                selected === option.id
                  ? 'border-blue-300 bg-blue-50 text-blue-800'
                  : 'border-[var(--em-border)] bg-[var(--em-surface)] text-[var(--em-ink)] hover:border-[var(--em-border)] hover:bg-[var(--em-surface-subtle)]'
              )}
            >
              <span className="font-semibold text-[var(--em-muted-ink)]">{String.fromCharCode(65 + index)}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={submit} disabled={selected === null || result.status === 'loading' || result.status === 'done'}>
            {result.status === 'loading' ? <><Loader2 className="h-4 w-4 animate-spin" />正在评估…</> : alreadyRecorded || (result.status === 'done' && result.alreadyRecorded) ? '已记录' : '提交答案'}
          </Button>
          {result.status === 'done' && questionIndex < questions.length - 1 && <Button variant="outline" onClick={nextQuestion}>下一题</Button>}
          {result.status === 'error' && <span className="text-sm text-[var(--em-muted-ink)]">{result.message}</span>}
        </div>

        {result.status === 'done' && <div className="mt-5 rounded-xl border border-[var(--em-border)] bg-[var(--em-surface-subtle)]/70 p-4">
          <div className="flex items-center gap-2">
            {result.correct ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
            <span className="font-semibold text-[var(--em-ink)]">{result.correct ? '回答正确' : '回答错误'} · {Math.round(result.score * 100)}%</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">{result.feedback}</p>
          {result.alreadyRecorded && <p className="mt-2 text-xs text-[var(--em-muted-ink)]">此题此前已有作答记录，本次没有重复计入。</p>}
          {result.data && !result.alreadyRecorded && <>
            <div className="mt-4 flex items-center gap-4">
              <div>
                <p className="text-xs text-[var(--em-muted-ink)]">PV 操作掌握度</p>
                <p className="mt-0.5 text-sm text-[var(--em-muted-ink)]">{Math.round(result.data.masteryBefore * 100)}% <span className="text-[var(--em-muted-ink)]">→</span> <span className="font-bold text-blue-700">{Math.round(result.data.masteryAfter * 100)}%</span></p>
              </div>
              <div>
                <p className="text-xs text-[var(--em-muted-ink)]">置信度</p>
                <p className="mt-0.5 text-sm text-[var(--em-ink)]">{Math.round(result.data.confidence * 100)}%</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />学习证据已记录</p>
          </>}
        </div>}
      </>}
    </div>
  );
}
