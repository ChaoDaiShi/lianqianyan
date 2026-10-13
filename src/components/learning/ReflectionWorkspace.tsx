import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Send,
} from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';
import {
  buildReflectionResult,
  type ReflectionResult,
} from '@/components/learning/learningLoop';
import {
  composeReflectionAnswers,
  REFLECTION_FEEDBACK_DISCLAIMER,
  REFLECTION_PROMPTS,
  type ReflectionAnswers,
  type ReflectionPromptKey,
} from '@/components/learning/reflectionPresentation';
import { XiaolianFeedbackBubble } from '@/components/xiaolian/XiaolianFeedbackBubble';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { KnowledgePointContent } from '@/lib/educationApi';

export interface ReflectionWorkspaceProps {
  learnerId: string;
  courseId: string;
  taskId: string;
  knowledge: KnowledgePointContent;
  initialResult?: ReflectionResult | null;
  onComplete: (result: ReflectionResult) => void;
}

type ReflectionWorkspaceState =
  | 'idle'
  | 'writing'
  | 'analyzing'
  | 'completed';

const ANALYZING_DELAY_MS = 500;

export function ReflectionWorkspace({
  learnerId,
  courseId,
  taskId,
  knowledge,
  initialResult = null,
  onComplete,
}: ReflectionWorkspaceProps) {
  const validInitialResult =
    initialResult?.knowledgePointId === knowledge.knowledgePointId
      ? initialResult
      : null;
  const objectives = useMemo(
    () =>
      knowledge.sections
        .map((section) => section.title.trim())
        .filter((title) => title.length > 0),
    [knowledge.sections],
  );
  const [answers, setAnswers] = useState<ReflectionAnswers>(() => ({
    blindSpot: validInitialResult?.submittedText ?? '',
    keyLogic: '',
    firstCheck: '',
  }));
  const [result, setResult] = useState<ReflectionResult | null>(
    validInitialResult,
  );
  const [state, setState] = useState<ReflectionWorkspaceState>(
    validInitialResult ? 'completed' : 'idle',
  );
  const analyzingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trimmedInput = composeReflectionAnswers(answers);
  const answeredPromptCount = REFLECTION_PROMPTS.filter(
    ({ key }) => answers[key].trim().length > 0,
  ).length;
  const canSubmit =
    objectives.length > 0 &&
    answeredPromptCount === REFLECTION_PROMPTS.length &&
    state === 'writing';

  useEffect(
    () => () => {
      if (analyzingTimer.current) clearTimeout(analyzingTimer.current);
    },
    [],
  );

  const handleInputChange = (key: ReflectionPromptKey, value: string) => {
    const nextAnswers = { ...answers, [key]: value };
    setAnswers(nextAnswers);
    setResult(null);
    setState(Object.values(nextAnswers).some((answer) => answer.trim()) ? 'writing' : 'idle');
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    setState('analyzing');
    analyzingTimer.current = setTimeout(() => {
      const nextResult = buildReflectionResult({
        learnerId,
        courseId,
        taskId,
        knowledge,
        submittedText: trimmedInput,
        submittedAt: new Date().toISOString(),
      });
      setResult(nextResult);
      setState('completed');
      analyzingTimer.current = null;
      onComplete(nextResult);
    }, ANALYZING_DELAY_MS);
  };

  const handleReset = () => {
    if (analyzingTimer.current) {
      clearTimeout(analyzingTimer.current);
      analyzingTimer.current = null;
    }
    setAnswers({ blindSpot: '', keyLogic: '', firstCheck: '' });
    setResult(null);
    setState('idle');
  };

  return (
    <div className="space-y-5">
      <GlassPanel className="p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--em-primary-deep)]">
          <BookOpenCheck className="h-4 w-4" />
          元认知反思
        </div>
        <h1 className="mt-3 text-2xl font-bold">用自己的话讲明白</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--em-muted-ink)]">
          当前知识点：
          <strong className="text-[var(--em-ink)]">{knowledge.title}</strong>
        </p>

        <div className="mt-5 border-l-2 border-sky-300 pl-4">
          <p className="text-sm font-semibold text-[var(--em-ink)]">复述目标</p>
          {objectives.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[var(--em-muted-ink)]">
              {objectives.map((objective, index) => (
                <li key={`${objective}-${index}`} className="flex gap-2">
                  <span className="text-sky-500">•</span>
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-amber-700">
              当前知识点没有可用的章节标题，暂时无法提交复述。
            </p>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {REFLECTION_PROMPTS.map(({ key, question }, index) => (
            <fieldset key={key} className="rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-4">
              <label htmlFor={`reflection-${key}`} className="block text-sm font-semibold leading-6">{index + 1}. {question}</label>
              <Textarea
                id={`reflection-${key}`}
                value={answers[key]}
                disabled={state === 'analyzing'}
                onChange={(event) => handleInputChange(key, event.target.value)}
                placeholder={`结合「${knowledge.title}」写下你的思考`}
                rows={3}
                className="mt-2 border-[var(--em-border)] bg-[var(--em-surface)] p-3 leading-6 focus-visible:ring-[var(--em-focus-ring)]"
              />
            </fieldset>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--em-muted-ink)]">已回答 {answeredPromptCount}/{REFLECTION_PROMPTS.length} 个问题。三个问题均完成后可提交。</p>
        <p className="mt-2 rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-3 text-xs leading-5 text-[var(--em-muted-ink)]">提交结果保存在当前学习流程的本地状态中；当前没有将复述写入服务端 LearningEvidence、画像或掌握度的接口。</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="gap-2 bg-[var(--em-action)] hover:bg-[var(--em-action-hover)]"
          >
            {state === 'analyzing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {state === 'analyzing' ? '正在整理反馈' : '提交复述'}
          </Button>
          <Button
            variant="outline"
            disabled={state === 'idle' && !result}
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            清空重写
          </Button>
        </div>
        <p role="status" className="mt-3 text-xs text-[var(--em-muted-ink)]">
          当前状态：
          {state === 'idle'
            ? '尚未开始'
            : state === 'writing'
              ? '正在复述'
              : state === 'analyzing'
                ? '正在生成前端教学反馈'
                : '已完成'}
        </p>
      </GlassPanel>

      {state === 'completed' && result && (
        <>
          <GlassPanel
            className="border border-amber-200 p-6 sm:p-7"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold">确定性教学反馈</h2>
            </div>
            <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              {REFLECTION_FEEDBACK_DISCLAIMER}
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <section>
                <h3 className="text-sm font-semibold text-emerald-700">
                  已覆盖概念
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--em-muted-ink)]">
                  {result.coveredConcepts.length > 0
                    ? result.coveredConcepts.join('、')
                    : '无'}
                </p>
              </section>
              <section>
                <h3 className="text-sm font-semibold text-amber-700">
                  待补充概念
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--em-muted-ink)]">
                  {result.missingConcepts.length > 0
                    ? result.missingConcepts.join('、')
                    : '无'}
                </p>
              </section>
            </div>

            <div className="mt-5 border-t border-amber-100 pt-4">
              <h3 className="text-sm font-semibold">下一步建议</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--em-muted-ink)]">
                {result.nextSuggestion}
              </p>
            </div>
            <p className="mt-4 text-xs leading-5 text-amber-800">
              本结果保存在当前学习流程的本地状态；当前没有写入服务端学习画像、LearningEvidence 或掌握度的接口。
            </p>
          </GlassPanel>

          <XiaolianFeedbackBubble
            scenario="reflection_completed"
            result={result}
          />
        </>
      )}
    </div>
  );
}
