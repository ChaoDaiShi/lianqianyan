import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileQuestion,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  evaluatePractice,
  fetchPracticeQuestions,
  type PracticeEvaluationResponse,
  type PracticeQuestion,
  type ReplanningResult,
} from '@/lib/educationApi';
import { ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID } from '@/store';
import { cn } from '@/lib/utils';

interface ModulePracticeProps {
  taskId: string;
  knowledgePointId: string;
  knowledgePointName: string;
  /** 练习成功后刷新 Profile / Diagnosis / Current Plan，并返回刷新是否成功。 */
  onPracticeComplete?: (replanning: ReplanningResult) => Promise<boolean> | boolean;
  /** 将本次服务端评价完整结果交给页面展示，不做二次计算。 */
  onEvaluationComplete?: (result: PracticeEvaluationResponse) => void;
  /** 仅报告真实 Practice Evaluation 请求是否进行中。 */
  onEvaluationPendingChange?: (pending: boolean) => void;
}

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

type RefreshStatus = 'idle' | 'refreshing' | 'done' | 'error';

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function recordedResult(question: PracticeQuestion | undefined): ResultState {
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

/** 知识点练习区：题目、答案和评分均由服务端题库与判分接口提供。 */
export function ModulePractice({
  taskId,
  knowledgePointId,
  knowledgePointName,
  onPracticeComplete,
  onEvaluationComplete,
  onEvaluationPendingChange,
}: ModulePracticeProps) {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState>({ status: 'idle' });
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>('idle');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    const requestGeneration = ++requestGenerationRef.current;
    setQuestions([]);
    setQIndex(0);
    setSelected(null);
    setResult({ status: 'idle' });
    setRefreshStatus('idle');
    setLoading(true);
    setLoadError(false);

    void fetchPracticeQuestions({
      learnerId: ACTIVE_LEARNER_ID,
      courseId: ACTIVE_COURSE_ID,
      knowledgePointId,
    }).then((catalog) => {
      if (requestGeneration !== requestGenerationRef.current) return;
      setQuestions(catalog.questions);
      setSelected(catalog.questions[0]?.recordedResult?.optionId ?? null);
      setResult(recordedResult(catalog.questions[0]));
      setLoading(false);
    }).catch(() => {
      if (requestGeneration !== requestGenerationRef.current) return;
      setLoadError(true);
      setLoading(false);
    });

    return () => {
      requestGenerationRef.current += 1;
    };
  }, [knowledgePointId, taskId]);

  const question = questions[qIndex];
  const questionRecorded = question?.recordedResult !== null && question?.recordedResult !== undefined;
  const canSubmit = selected !== null && result.status !== 'loading' && result.status !== 'done';

  const submit = async () => {
    if (selected === null || !question || !canSubmit) return;
    const requestGeneration = requestGenerationRef.current;
    setResult({ status: 'loading' });
    onEvaluationPendingChange?.(true);
    try {
      const data = await evaluatePractice({
        learnerId: ACTIVE_LEARNER_ID,
        courseId: ACTIVE_COURSE_ID,
        knowledgePointId,
        questionId: question.id,
        optionId: selected,
      });
      if (requestGeneration !== requestGenerationRef.current) return;
      window.dispatchEvent(new Event('educationmind:evidence-updated'));
      const correct = data.isCorrect ?? false;
      const score = data.score ?? (correct ? 1 : 0);
      const feedback = data.feedback ?? '服务端已记录本次作答。';
      setQuestions((current) => current.map((item) => (
        item.id === question.id
          ? { ...item, recordedResult: { optionId: selected, isCorrect: correct, score, feedback } }
          : item
      )));
      setResult({
        status: 'done',
        correct,
        score,
        feedback,
        alreadyRecorded: data.alreadyRecorded ?? false,
        data,
      });
      onEvaluationComplete?.(data);
      if (onPracticeComplete && !data.alreadyRecorded) {
        setRefreshStatus('refreshing');
        const refreshed = await onPracticeComplete(data.replanning);
        if (requestGeneration !== requestGenerationRef.current) return;
        setRefreshStatus(refreshed ? 'done' : 'error');
      } else if (!data.alreadyRecorded) {
        setRefreshStatus('done');
      }
    } catch {
      if (requestGeneration === requestGenerationRef.current) {
        setResult({ status: 'error', message: '暂时没能记录这次练习结果，请稍后再试。' });
      }
    } finally {
      if (requestGeneration === requestGenerationRef.current) onEvaluationPendingChange?.(false);
    }
  };

  const nextQuestion = () => {
    if (qIndex >= questions.length - 1) return;
    const nextIndex = qIndex + 1;
    const next = questions[nextIndex];
    setQIndex(nextIndex);
    setSelected(next?.recordedResult?.optionId ?? null);
    setResult(recordedResult(next));
    setRefreshStatus('idle');
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)]">
        <p className="flex items-center gap-2 text-sm text-[var(--em-muted-ink)]">
          <Loader2 className="h-4 w-4 animate-spin" />正在读取当前知识点练习题…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)]">
        <div className="flex items-center gap-2">
          <FileQuestion className="h-4 w-4 text-[var(--em-primary)]" />
          <h2 className="text-lg font-bold text-[var(--em-ink)]">{knowledgePointName} · 快速练习</h2>
        </div>
        <p role="alert" className="mt-4 text-sm text-[var(--em-danger)]">练习题暂时无法读取，请稍后重试。</p>
      </div>
    );
  }

  if (questions.length === 0 || !question) {
    return (
      <div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)]">
        <div className="flex items-center gap-2">
          <FileQuestion className="h-4 w-4 text-[var(--em-primary)]" />
          <h2 className="text-lg font-bold text-[var(--em-ink)]">{knowledgePointName} · 快速练习</h2>
        </div>
        <p className="mt-4 text-sm text-[var(--em-muted-ink)]">当前知识点暂未配置可用练习题，可先向小涟提问，或返回选择其他任务。</p>
      </div>
    );
  }

  const before = result.status === 'done' && result.data && !result.alreadyRecorded
    ? result.data.masteryBefore
    : null;
  const after = result.status === 'done' && result.data && !result.alreadyRecorded
    ? result.data.masteryAfter
    : null;

  return (
    <div className="rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] p-5 shadow-[var(--em-shadow-sm)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileQuestion className="h-4 w-4 text-[var(--em-primary)]" />
          <h2 className="text-lg font-bold text-[var(--em-ink)]">{knowledgePointName} · 快速练习</h2>
        </div>
        <span className="rounded-full bg-[var(--em-surface-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--em-muted-ink)]">
          {qIndex + 1} / {questions.length}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-[var(--em-ink)]">{question.prompt}</p>

      <div className="mt-3 space-y-2">
        {question.options.map((option, index) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              disabled={result.status === 'loading' || questionRecorded || result.status === 'done'}
              onClick={() => setSelected(option.id)}
              className={cn(
                'flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                isSelected
                  ? 'border-[var(--em-primary)] bg-[var(--em-primary-subtle)] text-[var(--em-primary)]'
                  : 'border-[var(--em-border)] bg-[var(--em-surface)] text-[var(--em-ink)] hover:border-[var(--em-border-strong)] hover:bg-[var(--em-surface-subtle)]'
              )}
            >
              <span className="font-semibold text-[var(--em-subtle-ink)]">{String.fromCharCode(65 + index)}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={submit} disabled={!canSubmit}>
          {result.status === 'loading' ? (
            <><Loader2 className="h-4 w-4 animate-spin" />正在评估…</>
          ) : questionRecorded || (result.status === 'done' && result.alreadyRecorded) ? '已记录' : '提交答案'}
        </Button>
        {result.status === 'done' && qIndex < questions.length - 1 && (
          <Button variant="outline" onClick={nextQuestion}>下一题</Button>
        )}
        {result.status === 'error' && <span className="text-sm text-[var(--em-muted-ink)]">{result.message}</span>}
      </div>

      {result.status === 'done' && (
        <div className="mt-5 rounded-xl border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-4">
          <div className="flex items-center gap-2">
            {result.correct ? <CheckCircle2 className="h-5 w-5 text-[var(--em-success)]" /> : <XCircle className="h-5 w-5 text-[var(--em-danger)]" />}
            <span className="font-semibold text-[var(--em-ink)]">{result.correct ? '回答正确' : '回答错误'} · {pct(result.score)}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">{result.feedback}</p>
          {result.alreadyRecorded && (
            <p className="mt-2 text-xs text-[var(--em-muted-ink)]">此题此前已有作答记录，本次没有重复计入。</p>
          )}
          {before != null && after != null && result.data && (
            <div className="mt-3 flex items-center gap-4">
              <div>
                <p className="text-xs text-[var(--em-muted-ink)]">{knowledgePointName}掌握度</p>
                <p className="mt-0.5 text-sm text-[var(--em-ink)]">{pct(before)} <span className="text-[var(--em-subtle-ink)]">→</span> <span className="font-bold text-[var(--em-primary)]">{pct(after)}</span></p>
              </div>
              <div>
                <p className="text-xs text-[var(--em-muted-ink)]">置信度</p>
                <p className="mt-0.5 text-sm text-[var(--em-ink)]">{pct(result.data.confidence)}</p>
              </div>
            </div>
          )}
          {!result.alreadyRecorded && result.data && (
            <div className="mt-3 rounded-lg bg-[var(--em-primary-subtle)] p-3">
              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-[var(--em-ink)]">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[var(--em-primary)]" />
                {after != null && before != null && after > before
                  ? `本次练习帮助你进一步巩固了「${knowledgePointName}」。`
                  : after != null && before != null && after < before
                    ? '这次练习暴露出了一些还需要巩固的内容。'
                    : '学习状态已更新。'}
              </p>
              {refreshStatus === 'refreshing' && <p className="mt-1 flex items-start gap-1.5 text-xs text-[var(--em-primary)]"><Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin" />正在刷新学习画像与诊断…</p>}
              {refreshStatus === 'done' && <p className="mt-1 flex items-start gap-1.5 text-xs text-[var(--em-muted-ink)]"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[var(--em-success)]" />小涟已经记录这次学习结果，你的学习画像与诊断已更新。</p>}
              {refreshStatus === 'error' && <p className="mt-1 flex items-start gap-1.5 text-xs text-[var(--em-warning)]"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />练习结果已记录，但学习画像或诊断暂时未能刷新，请稍后重试页面数据。</p>}
              {result.data.replanning.status === 'performed' && <p className="mt-1 text-xs text-[var(--em-primary)]">小涟已调整你的学习计划{result.data.replanning.previousTopTask && result.data.replanning.newTopTask ? `：${result.data.replanning.previousTopTask.knowledgePointName} → ${result.data.replanning.newTopTask.knowledgePointName}` : '。'}</p>}
              {result.data.replanning.status === 'not_needed' && <p className="mt-1 text-xs text-[var(--em-muted-ink)]">学习状态已更新，当前学习计划仍然适合你。</p>}
              {result.data.replanning.status === 'failed' && <p className="mt-1 text-xs text-[var(--em-warning)]">本次学习结果已经记录，但学习计划暂未能更新。</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
