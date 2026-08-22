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
import { XiaolianFeedbackBubble } from '@/components/xiaolian/XiaolianFeedbackBubble';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { KnowledgePointContent } from '@/lib/educationApi';

export interface ReflectionWorkspaceProps {
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
const FEEDBACK_DISCLAIMER =
  '褰撳墠涓哄墠绔暀瀛﹀弽棣堟紨绀猴紝涓嶄唬琛?AI 鑷姩璇勫垎';

export function ReflectionWorkspace({
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
  const [input, setInput] = useState(validInitialResult?.submittedText ?? '');
  const [result, setResult] = useState<ReflectionResult | null>(
    validInitialResult,
  );
  const [state, setState] = useState<ReflectionWorkspaceState>(
    validInitialResult ? 'completed' : 'idle',
  );
  const analyzingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trimmedInput = input.trim();
  const canSubmit =
    objectives.length > 0 &&
    trimmedInput.length > 0 &&
    state === 'writing';

  useEffect(
    () => () => {
      if (analyzingTimer.current) clearTimeout(analyzingTimer.current);
    },
    [],
  );

  const handleInputChange = (value: string) => {
    setInput(value);
    setResult(null);
    setState(value.trim() ? 'writing' : 'idle');
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    setState('analyzing');
    analyzingTimer.current = setTimeout(() => {
      const nextResult = buildReflectionResult({
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
    setInput('');
    setResult(null);
    setState('idle');
  };

  return (
    <div className="space-y-5">
      <GlassPanel className="p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-bold text-primary-700">
          <BookOpenCheck className="h-4 w-4" />
          FEYNMAN REFLECTION
        </div>
        <h1 className="mt-3 text-3xl font-bold">用自己的话讲明白</h1>
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

        <label htmlFor="reflection-input" className="mt-6 block text-sm font-semibold">
          我的理解
        </label>
        <Textarea
          id="reflection-input"
          value={input}
          disabled={state === 'analyzing'}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder={`请用自己的话解释「${knowledge.title}」`}
          className="mt-2 min-h-[220px] border-violet-200 bg-white/70 p-4 leading-7 focus-visible:ring-primary-400"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="gap-2 bg-primary-500 hover:bg-primary-600"
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
              {FEEDBACK_DISCLAIMER}
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
              本页面不会更新学习者画像、LearningEvidence 或 mastery。
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
