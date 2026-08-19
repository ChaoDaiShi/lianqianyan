import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { chatWithTutor } from '@/lib/educationApi';
import { cn } from '@/lib/utils';

/** Demo 场景常量（与后端 Demo Seed 保持一致）。 */
const DEMO_LEARNER_ID = 'demo-user-001';
const DEMO_COURSE_ID = 'course-os';

/** 演示建议问题（真实 Demo 场景，点击即发送）。 */
const DEMO_QUESTIONS = [
  '为什么我总学不会死锁？',
  '我今天应该学什么？',
  'PV 操作掌握了吗？',
];

/** context_used 中文标签（解释能力：本次回答用了哪些学习上下文）。 */
const CONTEXT_LABELS: Record<string, string> = {
  profile: '学习画像',
  diagnosis: '学习诊断',
  study_plan: '学习计划',
  evidence: '最近学习记录',
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** 本次回答使用的学习上下文（assistant 消息展示）。 */
  contextUsed?: string[];
  /** LLM 失败后的兜底回答（诚实标记）。 */
  isFallback?: boolean;
  suggestedActions?: string[];
}

function buildAssistantMessage(
  content: string,
  extra?: Partial<Pick<ChatMessage, 'contextUsed' | 'isFallback' | 'suggestedActions'>>
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content,
    ...extra,
  };
}

/**
 * 小涟 · AI学习导师 —— 基于学生学习上下文（画像 / 诊断 / 计划）的对话窗口。
 * 发送 → POST /api/tutor/chat → 展示 answer / context_used / suggested_actions。
 */
export function XiaolianPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    buildAssistantMessage(
      '你好，我是小涟，你的 AI 学习导师。\n我可以结合你的学习画像、学习诊断和学习计划来回答你的问题。试试点击下面的问题，或直接输入你的疑问？'
    ),
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, pending]);

  const handleSend = async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || pending) return;
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: text },
    ]);
    setPending(true);
    try {
      const result = await chatWithTutor({
        learnerId: DEMO_LEARNER_ID,
        courseId: DEMO_COURSE_ID,
        message: text,
      });
      setMessages((prev) => [
        ...prev,
        buildAssistantMessage(result.answer, {
          contextUsed: result.contextUsed,
          isFallback: result.source === 'fallback',
          suggestedActions: result.suggestedActions,
        }),
      ]);
    } catch (error) {
      console.error('Tutor chat failed:', error);
      setMessages((prev) => [
        ...prev,
        buildAssistantMessage('小涟暂时无法连接，请稍后再试。'),
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-3xl flex-col">
        {/* 顶部：小涟 · AI学习导师 */}
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">小涟 · AI学习导师</h1>
            <p className="text-xs text-gray-500">
              基于你的学习画像、诊断与计划作答 · 不编造不存在的学习记录
            </p>
          </div>
        </div>

        {/* 聊天区域 */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto py-5 pr-1"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-800 shadow-sm'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Sparkles className="h-3 w-3 text-blue-500" />
                    小涟
                    {msg.isFallback && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                        兜底回答
                      </span>
                    )}
                  </div>
                )}
                {msg.content.split('\n').map((line, idx) => (
                  <p key={idx} className={cn(idx > 0 && 'mt-1')}>
                    {line}
                  </p>
                ))}
                {/* 解释能力：本次回答用了哪些学习上下文 */}
                {msg.role === 'assistant' &&
                  msg.contextUsed &&
                  msg.contextUsed.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-2">
                      <span className="text-[11px] text-gray-400">已参考：</span>
                      {msg.contextUsed.map((key) => (
                        <span
                          key={key}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600"
                        >
                          {CONTEXT_LABELS[key] ?? key}
                        </span>
                      ))}
                    </div>
                  )}
                {msg.role === 'assistant' &&
                  msg.suggestedActions &&
                  msg.suggestedActions.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                      <p className="text-[11px] font-medium text-gray-400">下一步建议</p>
                      {msg.suggestedActions.map((action, idx) => (
                        <p key={idx} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                          {action}
                        </p>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          ))}

          {/* 小涟正在分析 */}
          {pending && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
                小涟正在分析你的学习情况...
              </div>
            </div>
          )}
        </div>

        {/* 演示建议问题 */}
        <div className="flex flex-wrap gap-2 pb-3">
          {DEMO_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              disabled={pending}
              onClick={() => handleSend(question)}
              className="rounded-full border border-blue-200 bg-blue-50/60 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {question}
            </button>
          ))}
        </div>

        {/* 底部输入区 */}
        <form
          className="flex items-center gap-2 border-t border-gray-100 pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend();
          }}
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="向小涟提问，例如：为什么我总学不会死锁？"
            className="flex-1"
            disabled={pending}
          />
          <Button type="submit" disabled={pending || !input.trim()} size="icon" aria-label="发送">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
