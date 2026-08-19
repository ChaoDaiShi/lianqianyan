import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  chatWithAgents,
  type AgentCapability,
  type AgentChatResponse,
  type AgentTraceItem,
} from '@/lib/educationApi';
import { cn } from '@/lib/utils';

const DEMO_LEARNER_ID = 'demo-user-001';
const DEMO_COURSE_ID = 'course-os';

const CAPABILITIES: Array<{
  capability: AgentCapability;
  label: string;
  question: string;
}> = [
  { capability: 'diagnosis', label: '学习诊断', question: '我现在学得怎么样？' },
  { capability: 'planning', label: '学习规划', question: '我今天应该学什么？' },
  { capability: 'tutoring', label: '学习辅导', question: '给我解释死锁四个必要条件。' },
  { capability: 'assessment', label: '学习评估', question: '分析一下我刚才的练习。' },
];

const DEMO_QUESTIONS = [
  '我现在最应该学什么，为什么？',
  '给我解释死锁四个必要条件。',
  'PV 操作掌握了吗？',
];

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
  contextUsed?: string[];
  isFallback?: boolean;
  suggestedActions?: string[];
  agentTrace?: AgentTraceItem[];
}

function buildAssistantMessage(content: string, extra?: Partial<ChatMessage>): ChatMessage {
  return { id: crypto.randomUUID(), role: 'assistant', content, ...extra };
}

function Trace({ items }: { items: AgentTraceItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <p className="text-[11px] text-gray-400">本次由</p>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-medium text-blue-600">
        {items.map((item, index) => (
          <span key={`${item.agent}-${index}`} className="flex items-center gap-1">
            {index > 0 && <span className="text-gray-300">→</span>}
            {item.label}
          </span>
        ))}
        <span className="font-normal text-gray-400">协同完成</span>
      </div>
    </div>
  );
}

export function XiaolianPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    buildAssistantMessage(
      '你好，我是小涟，你的智能学习中枢。\n我会结合你的学习画像、诊断结果和学习计划，为你提供针对性的学习帮助。'
    ),
  ]);
  const [input, setInput] = useState('');
  const [selectedCapability, setSelectedCapability] = useState<AgentCapability | null>(null);
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  const handleCapability = (capability: AgentCapability, question: string) => {
    setSelectedCapability(capability);
    setInput(question);
  };

  const handleSend = async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || pending) return;
    setInput('');
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }]);
    setPending(true);
    try {
      const result: AgentChatResponse = await chatWithAgents({
        learnerId: DEMO_LEARNER_ID,
        courseId: DEMO_COURSE_ID,
        message: text,
        capability: selectedCapability,
      });
      setSelectedCapability(null);
      setMessages((prev) => [
        ...prev,
        buildAssistantMessage(result.answer, {
          contextUsed: result.contextUsed,
          isFallback: result.responseMode === 'fallback',
          suggestedActions: result.suggestedActions.map((action) => action.label),
          agentTrace: result.agentTrace,
        }),
      ]);
    } catch (error) {
      console.error('Agent chat failed:', error);
      setMessages((prev) => [...prev, buildAssistantMessage('小涟暂时无法连接，请稍后再试。')]);
    } finally {
      setPending(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-3xl flex-col">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">小涟 · 智能学习中枢</h1>
            <p className="text-xs text-gray-500">结合你的学习画像、诊断结果和学习计划，为你提供针对性的学习帮助。</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 py-3 sm:grid-cols-4">
          {CAPABILITIES.map((item) => (
            <button
              key={item.capability}
              type="button"
              disabled={pending}
              onClick={() => handleCapability(item.capability, item.question)}
              className={cn(
                'rounded-xl border px-3 py-2 text-left text-xs transition-colors disabled:opacity-50',
                selectedCapability === item.capability
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-100 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50/50'
              )}
            >
              <span className="font-semibold">{item.label}</span>
              <span className="mt-0.5 block text-[10px] text-gray-400">点击预填问题</span>
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-2 pr-1">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed', msg.role === 'user' ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-800 shadow-sm')}>
                {msg.role === 'assistant' && (
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Sparkles className="h-3 w-3 text-blue-500" />
                    小涟
                    {msg.isFallback && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">基础辅导模式</span>}
                  </div>
                )}
                {msg.content.split('\n').map((line, index) => <p key={index} className={cn(index > 0 && 'mt-1')}>{line}</p>)}
                {msg.role === 'assistant' && msg.contextUsed && msg.contextUsed.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-2">
                    <span className="text-[11px] text-gray-400">已参考：</span>
                    {msg.contextUsed.map((key) => <span key={key} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">{CONTEXT_LABELS[key] ?? key}</span>)}
                  </div>
                )}
                {msg.role === 'assistant' && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                    <p className="text-[11px] font-medium text-gray-400">下一步建议</p>
                    {msg.suggestedActions.map((action, index) => <p key={index} className="flex items-start gap-1.5 text-xs text-gray-600"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />{action}</p>)}
                  </div>
                )}
                {msg.role === 'assistant' && msg.agentTrace && <Trace items={msg.agentTrace} />}
              </div>
            </div>
          ))}
          {pending && <div className="flex justify-start"><div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">小涟正在协调学习能力...</div></div>}
        </div>

        <div className="flex flex-wrap gap-2 pb-3">
          {DEMO_QUESTIONS.map((question) => <button key={question} type="button" disabled={pending} onClick={() => void handleSend(question)} className="rounded-full border border-blue-200 bg-blue-50/60 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">{question}</button>)}
        </div>

        <form className="flex items-center gap-2 border-t border-gray-100 pt-3" onSubmit={(event) => { event.preventDefault(); void handleSend(); }}>
          <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="向小涟提问，例如：为什么我总学不会死锁？" className="flex-1" disabled={pending} />
          <Button type="submit" disabled={pending || !input.trim()} size="icon" aria-label="发送"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </AppShell>
  );
}
