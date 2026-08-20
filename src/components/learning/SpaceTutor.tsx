import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, Loader2 } from 'lucide-react';
import { DEMO_LEARNER_ID, DEMO_COURSE_ID } from '@/store';
import { useAgentChat } from '@/lib/hooks';
import type { AgentChatResponse } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SourceReferences } from '@/components/learning/SourceReferences';

interface SpaceTutorProps {
  knowledgePointId?: string;
  knowledgePointName?: string;
  quickQuestions?: string[];
}

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contextUsed?: string[];
  isFallback?: boolean;
  agentTrace?: AgentChatResponse['agentTrace'];
  sources?: AgentChatResponse['sources'];
  provider?: string;
  model?: string | null;
}

const CONTEXT_LABELS: Record<string, string> = {
  profile: '学习画像',
  diagnosis: '学习诊断',
  study_plan: '学习计划',
  evidence: '最近学习记录',
};

/** 学习空间内嵌小涟，使用与 XiaolianPage 相同的 Agent API。 */
export function SpaceTutor({ knowledgePointId, knowledgePointName, quickQuestions }: SpaceTutorProps) {
  const { send, pending } = useAgentChat(DEMO_LEARNER_ID, DEMO_COURSE_ID, knowledgePointId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const topic = knowledgePointName ?? '这个知识点';

  useEffect(() => {
    if (knowledgePointName) {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `我是小涟。你现在正在学习「${knowledgePointName}」。\n如果某个概念没理解，可以直接问我。`,
        },
      ]);
    }
  }, [knowledgePointName]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, pending]);

  const handleSend = async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || pending) return;
    setInput('');
    setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'user', content: text }]);
    const result: AgentChatResponse | null = await send(text);
    if (!result) {
      setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: '小涟暂时无法连接，请稍后再试。' }]);
      return;
    }
    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer,
        contextUsed: result.contextUsed,
        isFallback: result.responseMode === 'fallback',
        agentTrace: result.agentTrace,
        sources: result.sources,
        provider: result.provider,
        model: result.model,
      },
    ]);
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-blue-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Bot className="h-4 w-4" /></div>
        <div><p className="text-sm font-bold text-gray-900">问问小涟</p><p className="text-[11px] text-gray-400">当前学习任务内的智能陪伴助手</p></div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[88%] rounded-2xl px-3 py-2.5 text-[13px] leading-relaxed', msg.role === 'user' ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-gray-50/60 text-gray-800')}>
              {msg.role === 'assistant' && <div className="mb-1 flex items-center gap-1 text-[10px] text-gray-400"><Sparkles className="h-2.5 w-2.5 text-blue-500" />小涟{msg.isFallback && <span className="rounded bg-amber-50 px-1 py-px text-[9px] text-amber-600">基础辅导模式</span>}</div>}
              <p className="whitespace-pre-line">{msg.content}</p>
              {msg.role === 'assistant' && msg.contextUsed && msg.contextUsed.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1 border-t border-gray-200 pt-1.5"><span className="text-[10px] text-gray-400">已参考：</span>{msg.contextUsed.map((key) => <span key={key} className="rounded-full bg-blue-50 px-1.5 py-px text-[10px] text-blue-600">{CONTEXT_LABELS[key] ?? key}</span>)}</div>}
              {msg.role === 'assistant' && msg.agentTrace && msg.agentTrace.length > 0 && <div className="mt-1.5 border-t border-gray-200 pt-1.5 text-[10px] text-blue-600">本次由：{msg.agentTrace.map((item) => item.label).join(' → ')} 协同完成</div>}
              {msg.role === 'assistant' && msg.provider && <div className="mt-1 text-[10px] text-gray-400">Provider：{msg.provider}{msg.model ? ` · ${msg.model}` : ' · 本地演示'}</div>}
              {msg.role === 'assistant' && msg.sources && <SourceReferences sources={msg.sources} />}
            </div>
          </div>
        ))}
        {pending && <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />小涟正在协调学习能力…</div></div>}
      </div>

      {quickQuestions && quickQuestions.length > 0 && <div className="flex flex-wrap gap-1.5 border-t border-gray-100 px-4 py-2.5">{quickQuestions.map((question) => <button key={question} type="button" disabled={pending} onClick={() => void handleSend(question)} className="rounded-full border border-blue-200 bg-blue-50/60 px-2.5 py-1 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50">{question}</button>)}</div>}

      <form className="flex items-center gap-2 border-t border-gray-100 px-4 py-3" onSubmit={(event) => { event.preventDefault(); void handleSend(); }}>
        <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder={`问问小涟「${topic}」…`} className="h-9 text-[13px]" disabled={pending} />
        <Button type="submit" size="icon" className="h-9 w-9" disabled={pending || !input.trim()} aria-label="发送"><Send className="h-3.5 w-3.5" /></Button>
      </form>
    </div>
  );
}
