import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileQuestion,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { evaluatePractice, type PracticeEvaluationResponse } from '@/lib/educationApi';
import { DEMO_LEARNER_ID, DEMO_COURSE_ID } from '@/store';
import type { DemoQuestion } from '@/content/learningContent';
import { cn } from '@/lib/utils';

interface ModulePracticeProps {
  knowledgePointName: string;
  questions: DemoQuestion[];
  /** 练习成功（已调用后端）后回调，用于刷新 Profile / Diagnosis。 */
  onPracticeComplete?: () => void;
}

type ResultState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; correct: boolean; data: PracticeEvaluationResponse }
  | { status: 'error'; message: string };

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * 知识点练习区 —— 本轮升级。
 *
 * 练习题本身属教学资源，允许前端集中保存（Demo Content）；
 * 但提交后**必须**调用真实 POST /api/practice/evaluate，掌握度变化
 * （before/after/confidence）由服务端计算并持久化，禁止前端 mastery += 5。
 */
export function ModulePractice({
  knowledgePointName,
  questions,
  onPracticeComplete,
}: ModulePracticeProps) {
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<ResultState>({ status: 'idle' });

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2">
          <FileQuestion className="h-4 w-4 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">快速练习</h2>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          当前知识点暂未配置演示练习题，可先向小涟提问，或返回选择其他任务。
        </p>
      </div>
    );
  }

  const question = questions[qIndex];
  const canSubmit =
    selected != null &&
    (result.status === 'idle' || result.status === 'error' || result.status === 'done');

  const submit = async () => {
    if (selected == null) return;
    const isCorrect = question.options[selected].correct;
    setResult({ status: 'loading' });
    try {
      const data = await evaluatePractice({
        learnerId: DEMO_LEARNER_ID,
        courseId: DEMO_COURSE_ID,
        knowledgePointId: question.knowledgePointId,
        questionId: question.id,
        isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        difficulty: question.difficulty,
      });
      setResult({ status: 'done', correct: isCorrect, data });
      onPracticeComplete?.();
    } catch {
      setResult({ status: 'error', message: '暂时没能记录这次练习结果，请稍后再试。' });
    }
  };

  const nextQuestion = () => {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      setSelected(null);
      setResult({ status: 'idle' });
    }
  };

  const before = result.status === 'done' ? result.data.masteryBefore : null;
  const after = result.status === 'done' ? result.data.masteryAfter : null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileQuestion className="h-4 w-4 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">{knowledgePointName} · 快速练习</h2>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
          {qIndex + 1} / {questions.length}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-gray-800">{question.prompt}</p>

      <div className="mt-3 space-y-2">
        {question.options.map((opt, idx) => {
          const isSelected = selected === idx;
          return (
            <button
              key={idx}
              type="button"
              disabled={result.status === 'loading'}
              onClick={() => setSelected(idx)}
              className={cn(
                'flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                isSelected
                  ? 'border-blue-300 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <span className="font-semibold text-gray-400">
                {String.fromCharCode(65 + idx)}
              </span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

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
        {result.status === 'done' && qIndex < questions.length - 1 && (
          <Button variant="outline" onClick={nextQuestion}>
            下一题
          </Button>
        )}
        {result.status === 'error' && (
          <span className="text-sm text-gray-500">{result.message}</span>
        )}
      </div>

      {/* 结果 + Mastery 反馈 */}
      {result.status === 'done' && before != null && after != null && (
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

          <div className="mt-3 flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-400">{knowledgePointName}掌握度</p>
              <p className="mt-0.5 text-sm text-gray-600">
                {pct(before)} <span className="text-gray-400">→</span>{' '}
                <span className="font-bold text-blue-700">{pct(after)}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">置信度</p>
              <p className="mt-0.5 text-sm text-gray-700">{pct(result.data.confidence)}</p>
            </div>
          </div>

          {/* 确定性 before/after 反馈文案 */}
          <div className="mt-3 rounded-lg bg-blue-50/70 p-3">
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-gray-700">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
              {after > before
                ? `本次练习帮助你进一步巩固了「${knowledgePointName}」。`
                : after < before
                  ? `这次练习暴露出了一些还需要巩固的内容。`
                  : `学习状态已更新。`}
            </p>
            <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-gray-500">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              小涟已经记录这次学习结果，你的学习画像已更新。
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
              计划将在后续重新规划时根据最新学习状态调整。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
