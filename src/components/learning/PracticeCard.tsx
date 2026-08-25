import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  evaluatePractice,
  type PracticeEvaluationResponse,
} from '@/lib/educationApi';
import { ACTIVE_LEARNER_ID } from '@/store';
import { cn } from '@/lib/utils';

/** 本轮固定的一道演示题。 */
const FIXED_QUESTION = {
  id: 'question-pv-demo-001',
  courseId: 'course-os',
  knowledgePointId: 'kp-pv',
  difficulty: 0.6,
  prompt:
    '某信号量初值为 1，一个进程执行 P 操作且资源可用时，信号量将如何变化？',
  options: [
    { key: 0, label: '信号量变为 0，进程继续执行', correct: true },
    { key: 1, label: '信号量变为 -1，进程阻塞', correct: false },
    { key: 2, label: '信号量变为 1，进程继续执行', correct: false },
    { key: 3, label: '信号量变为 2，进程继续执行', correct: false },
  ],
};

type ResultState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; correct: boolean; data: PracticeEvaluationResponse }
  | { status: 'error'; message: string };

/**
 * PV 操作 · 快速练习 —— 一道固定题，提交后调用真实
 * POST /api/practice/evaluate（掌握度由服务端计算并持久化）。
 */
export function PracticeCard() {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<ResultState>({ status: 'idle' });

  const canSubmit =
    selected !== null &&
    (result.status === 'idle' || result.status === 'error' || result.status === 'done');

  const submit = async () => {
    if (selected == null) return;
    const isCorrect = FIXED_QUESTION.options[selected].correct;
    setResult({ status: 'loading' });
    try {
      const data = await evaluatePractice({
        learnerId: ACTIVE_LEARNER_ID,
        courseId: FIXED_QUESTION.courseId,
        knowledgePointId: FIXED_QUESTION.knowledgePointId,
        questionId: FIXED_QUESTION.id,
        isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        difficulty: FIXED_QUESTION.difficulty,
      });
      setResult({ status: 'done', correct: isCorrect, data });
    } catch {
      setResult({
        status: 'error',
        message: '暂时没能记录这次练习结果，请稍后再试。',
      });
    }
  };

  const confidence = result.status === 'done' ? result.data.confidence : null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <FileQuestion className="h-4 w-4 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-900">PV 操作 · 快速练习</h2>
      </div>
      <p className="mt-3 text-sm text-gray-700">{FIXED_QUESTION.prompt}</p>

      {/* 选项 */}
      <div className="mt-4 space-y-2">
        {FIXED_QUESTION.options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            disabled={result.status === 'loading'}
            onClick={() => setSelected(opt.key)}
            className={cn(
              'flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
              selected === opt.key
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <span className="font-semibold text-gray-400">
              {String.fromCharCode(65 + opt.key)}
            </span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* 提交按钮 */}
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={submit} disabled={!canSubmit}>
          {result.status === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              正在评估…
            </>
          ) : (
            '提交答案'
          )}
        </Button>
        {result.status === 'error' && (
          <span className="text-sm text-gray-500">{result.message}</span>
        )}
      </div>

      {/* 结果 */}
      {result.status === 'done' && (
        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
          <div className="flex items-center gap-2">
            {result.correct ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-semibold text-gray-900">
              {result.correct ? '回答正确' : '回答错误'}
            </span>
          </div>

          {/* 掌握度变化 */}
          <div className="mt-4 flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-400">PV 操作掌握度</p>
              <p className="mt-0.5 text-sm text-gray-600">
                  {Math.round(result.data.masteryBefore * 100)}%{' '}
                  <span className="text-gray-400">→</span>{' '}
                  <span className="font-bold text-blue-700">
                    {Math.round(result.data.masteryAfter * 100)}%
                  </span>
              </p>
            </div>
            {confidence != null && (
              <div>
                <p className="text-xs text-gray-400">置信度</p>
                <p className="mt-0.5 text-sm text-gray-700">
                  {Math.round(confidence * 100)}%
                </p>
              </div>
            )}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            学习证据已记录
          </p>
        </div>
      )}
    </div>
  );
}
