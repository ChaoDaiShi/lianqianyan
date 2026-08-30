import { useEffect, useRef, useState } from 'react';
import { Brain, ChevronDown, Loader2, Send, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { XiaolianMessage } from '@/components/xiaolian/XiaolianMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AgentToolTrace } from '@/components/learning/AgentToolTrace';
import { chatWithAgents } from '@/lib/educationApi';
import type {
  AgentCapability,
  AgentChatResponse,
  AgentTraceItem,
  KnowledgeSource,
} from '@/lib/educationApi';
import { useLlmStatus } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { SpeechControls } from '@/components/digital-human/SpeechControls';
import { VoiceInputButton } from '@/components/digital-human/VoiceInputButton';
import { useSpeechRecognition } from '@/components/digital-human/useSpeechRecognition';
import { useSpeechSynthesis } from '@/components/digital-human/useSpeechSynthesis';
import {
  ACTIVE_COURSE_ID,
  ACTIVE_LEARNER_ID,
  useXiaolianRuntimeStore,
} from '@/store';
import {
  addCompanionMemory,
  appendCompanionMessage,
  createCompanionThread,
  deleteCompanionMemory,
  deleteCompanionThread,
  listCompanionThreads,
  type CompanionMessage,
  type CompanionThread,
} from '@/lib/companionApi';
import { ConversationRail } from '@/components/xiaolian/ConversationRail';
import { LongTermMemoryPanel } from '@/components/xiaolian/LongTermMemoryPanel';

const QUICK_QUESTIONS = ['我现在最应该学什么，为什么？', '给我解释死锁四个必要条件。', 'PV 操作掌握了吗？'];
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
  sources?: KnowledgeSource[];
  provider?: string;
  model?: string | null;
}

function assistantMessage(content: string, extra?: Partial<ChatMessage>): ChatMessage {
  return { id: crypto.randomUUID(), role: 'assistant', content, ...extra };
}

const GREETING = '你好，我是小涟。\n咱们先看你的目标或卡点，我会结合真实学习证据陪你讲清知识、完成训练与复盘。\n♪';

function fromPersisted(message: CompanionMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    contextUsed: message.context_used,
    suggestedActions: message.suggested_actions,
    provider: message.provider ?? undefined,
    model: message.model,
  };
}

export function XiaolianWorkspace({ embedded = false }: { embedded?: boolean }) {
  const llmStatus = useLlmStatus();
  const speech = useSpeechSynthesis();
  const [messages, setMessages] = useState<ChatMessage[]>([assistantMessage(GREETING)]);
  const [threads, setThreads] = useState<CompanionThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [memoryBusy, setMemoryBusy] = useState(false);
  const [input, setInput] = useState('');
  const voice = useSpeechRecognition({
    onFinalTranscript: (transcript) => {
      setInput((current) => [current.trim(), transcript].filter(Boolean).join(' '));
    },
  });
  const [pending, setPending] = useState(false);
  const runtimeState = useXiaolianRuntimeStore(
    (state) => state.runtimeState,
  );
  const companionState = useXiaolianRuntimeStore(
    (state) => state.companionState,
  );
  const setRuntimeState = useXiaolianRuntimeStore(
    (state) => state.setRuntimeState,
  );
  const setCompanionState = useXiaolianRuntimeStore(
    (state) => state.setCompanionState,
  );
  const resetRuntime = useXiaolianRuntimeStore((state) => state.reset);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending]);
  useEffect(() => () => resetRuntime(), [resetRuntime]);

  const applyThread = (thread: CompanionThread) => {
    setThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)]);
  };

  const openThread = (thread: CompanionThread) => {
    setActiveThreadId(thread.id);
    setMessages(thread.messages.length > 0 ? thread.messages.map(fromPersisted) : [assistantMessage(GREETING)]);
  };

  useEffect(() => {
    let cancelled = false;
    void listCompanionThreads(ACTIVE_COURSE_ID)
      .then(async (items) => {
        const next = items[0] ?? await createCompanionThread(ACTIVE_COURSE_ID);
        if (cancelled) return;
        setThreads(items.length > 0 ? items : [next]);
        openThread(next);
      })
      .catch(() => { if (!cancelled) setHistoryError('历史记录暂时无法读取；当前文字仍可继续查看。'); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const createThread = async () => {
    setHistoryError(null);
    try {
      const created = await createCompanionThread(ACTIVE_COURSE_ID);
      applyThread(created);
      openThread(created);
    } catch {
      setHistoryError('新对话创建失败，请稍后重试。');
    }
  };

  const removeThread = async (threadId: string) => {
    try {
      await deleteCompanionThread(threadId);
      const remaining = threads.filter((item) => item.id !== threadId);
      setThreads(remaining);
      if (activeThreadId === threadId) {
        if (remaining[0]) openThread(remaining[0]);
        else await createThread();
      }
    } catch {
      setHistoryError('对话删除失败，请稍后重试。');
    }
  };

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null;

  const handleSend = async (rawText?: string, capability?: AgentCapability | null) => {
    const text = (rawText ?? input).trim();
    if (!text || pending || !activeThreadId) return;
    voice.stop();
    speech.stop();
    const requestedCapability = capability ?? null;
    setInput('');
    setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'user', content: text }]);
    setPending(true);
    setRuntimeState('thinking');
    setCompanionState('companion');
    try {
      try {
        applyThread(await appendCompanionMessage(activeThreadId, { role: 'user', content: text }));
      } catch {
        setHistoryError('这条提问尚未保存到历史记录，可稍后重试。');
      }
      const result: AgentChatResponse = await chatWithAgents({
        learnerId: ACTIVE_LEARNER_ID,
        courseId: ACTIVE_COURSE_ID,
        message: text,
        capability: requestedCapability,
        threadId: activeThreadId,
      });
      const reply = assistantMessage(result.answer, {
        contextUsed: result.contextUsed,
        isFallback: result.responseMode === 'fallback',
        suggestedActions: result.suggestedActions.map((action) => action.label),
        agentTrace: result.agentTrace,
        sources: result.sources,
        provider: result.provider,
        model: result.model,
      });
      setMessages((previous) => [...previous, reply]);
      try {
        applyThread(await appendCompanionMessage(activeThreadId, {
          role: 'assistant',
          content: result.answer,
          context_used: result.contextUsed,
          suggested_actions: result.suggestedActions.map((action) => action.label),
          provider: result.provider,
          model: result.model,
        }));
      } catch {
        setHistoryError('回答已显示，但尚未保存到历史记录。');
      }
      setRuntimeState('idle');
      setCompanionState('encouraging');
    } catch {
      setMessages((previous) => [...previous, assistantMessage('小涟暂时无法连接，请稍后再试。')]);
      setRuntimeState('idle');
      setCompanionState('companion');
    } finally {
      setPending(false);
    }
  };

  const remember = async (content: string, sourceMessageId?: string) => {
    if (!activeThreadId || memoryBusy) return;
    setMemoryBusy(true);
    try {
      applyThread(await addCompanionMemory(activeThreadId, content, sourceMessageId));
    } catch {
      setHistoryError('长期记忆保存失败，请稍后重试。');
    } finally {
      setMemoryBusy(false);
    }
  };

  const forget = async (memoryId: string) => {
    if (!activeThreadId || memoryBusy) return;
    setMemoryBusy(true);
    try {
      applyThread(await deleteCompanionMemory(activeThreadId, memoryId));
    } catch {
      setHistoryError('长期记忆删除失败，请稍后重试。');
    } finally {
      setMemoryBusy(false);
    }
  };

  return (
      <div
        data-agent-workspace={embedded ? 'embedded' : 'full'}
        className={cn('mx-auto max-w-7xl', embedded ? 'min-h-[calc(100vh-4.5rem)]' : 'min-h-[calc(100vh-4.75rem)]')}
      >
        <div className="grid gap-3 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <ConversationRail threads={threads} activeId={activeThreadId} onCreate={() => void createThread()} onSelect={(id) => { const thread = threads.find((item) => item.id === id); if (thread) openThread(thread); }} onDelete={(id) => void removeThread(id)} />
          {activeThread ? <LongTermMemoryPanel memories={activeThread.memories} busy={memoryBusy} onAdd={(content) => void remember(content)} onDelete={(id) => void forget(id)} /> : null}
          {historyLoading ? <p className="flex items-center gap-2 px-3 text-xs text-[var(--em-muted-ink)]"><Loader2 className="h-3.5 w-3.5 animate-spin" />读取历史记录…</p> : null}
          {historyError ? <p role="status" className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-800">{historyError}</p> : null}
        </div>
        <GlassPanel className={cn('flex flex-col overflow-hidden rounded-[2rem]', embedded ? 'min-h-[calc(100vh-4.5rem)]' : 'min-h-[calc(100vh-4.75rem)]')}>
          <header className="border-b border-violet-100 px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-4">
              <XiaolianCharacter runtimeState={runtimeState} companionState={companionState} size="sm" speaking={speech.speaking} />
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-primary-700">XIAOLIAN CONVERSATION</p>
                <h1 className="mt-0.5 text-lg font-bold">和小涟一起想明白</h1>
                <p className="mt-0.5 text-xs text-[var(--em-muted-ink)]">说出目标或卡点，从历史与主动保存的记忆继续。</p>
              </div>
            </div>
            {pending && <XiaolianMessage tone="observe" compact className="mt-3">我正在结合真实学习状态整理回答。</XiaolianMessage>}
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.map((message) => <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[90%] rounded-[20px] px-4 py-3 text-sm leading-relaxed sm:max-w-[82%]', message.role === 'user' ? 'bg-primary-500 text-white' : 'border border-violet-100 bg-white/65 text-[var(--em-ink)]')}>
              {message.role === 'assistant' && <div className="mb-2 flex items-center gap-1.5 text-[11px] text-primary-600"><Sparkles className="h-3 w-3" />小涟{message.isFallback && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">基础辅导模式</span>}</div>}
              <p className="whitespace-pre-line">{message.content}</p>
              {message.role === 'assistant' && <div className="mt-3 flex flex-wrap items-center gap-2"><SpeechControls text={message.content} supported={speech.supported} speaking={speech.speaking} mode={speech.mode} onSpeak={speech.speak} onStop={speech.stop} /><button type="button" disabled={memoryBusy} onClick={() => void remember(message.content, message.id)} className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50/70 px-2.5 py-1 text-[10px] font-semibold text-primary-700"><Brain className="h-3 w-3" />记住这条</button></div>}
              {message.role === 'assistant' && (message.contextUsed?.length || message.suggestedActions?.length || message.agentTrace?.length || message.sources?.length || message.provider) ? <details className="group mt-3 border-t border-violet-100 pt-2"><summary className="flex cursor-pointer list-none items-center justify-between text-[11px] text-[var(--em-muted-ink)]"><span>回答详情</span><ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" /></summary><div className="mt-3 space-y-3">{message.contextUsed && message.contextUsed.length > 0 && <div className="flex flex-wrap gap-1.5"><span className="text-[11px] text-[var(--em-muted-ink)]">已参考：</span>{message.contextUsed.map((key) => <span key={key} className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-primary-700">{CONTEXT_LABELS[key] ?? key}</span>)}</div>}{message.suggestedActions?.length ? <div><p className="text-[11px] font-semibold text-[var(--em-muted-ink)]">下一步建议</p>{message.suggestedActions.map((action) => <p key={action} className="mt-1 text-xs text-[var(--em-muted-ink)]">· {action}</p>)}</div> : null}{(message.agentTrace || message.sources) && <AgentToolTrace items={message.agentTrace ?? []} sources={message.sources ?? []} compact />}{message.provider && <p className="text-[10px] text-[var(--em-muted-ink)]">对话服务：{message.provider}{message.model ? ` · ${message.model}` : ' · 基础辅导'}</p>}</div></details> : null}
            </div></div>)}
            {pending && <div className="rounded-[20px] border border-violet-100 bg-white/65 px-4 py-3 text-sm text-[var(--em-muted-ink)]">小涟正在协调学习能力…</div>}
          </div>

          <div className="border-t border-violet-100 p-4">
            {messages.length === 1 && <div className="mb-3 flex flex-wrap gap-2">{QUICK_QUESTIONS.map((question) => <button key={question} type="button" disabled={pending} onClick={() => void handleSend(question, null)} className="rounded-full border border-violet-200 bg-violet-50/65 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-violet-100 disabled:opacity-50">{question}</button>)}</div>}
            <form className="flex items-start gap-2" onSubmit={(event) => { event.preventDefault(); void handleSend(); }}><Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="向小涟提问，例如：为什么我总学不会死锁？" className="h-11 flex-1 rounded-2xl bg-white/70" disabled={pending} /><VoiceInputButton supported={voice.supported} listening={voice.listening} interimTranscript={voice.interimTranscript} error={voice.error} disabled={pending} compact onStart={() => { speech.stop(); voice.start(); }} onStop={voice.stop} className="shrink-0" /><Button type="submit" disabled={pending || !input.trim()} size="icon" className="h-11 w-11 shrink-0 rounded-2xl bg-primary-500" aria-label="发送"><Send className="h-4 w-4" /></Button></form>
            <p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">语音仅填入输入框，确认文字后再发送；音频不会上传到涟千言后端。</p>
            <details className="group mt-3"><summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] font-medium text-[var(--em-muted-ink)]">更多 · 服务状态<ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" /></summary><div className="mt-3 space-y-2"><p className="text-[10px] text-[var(--em-muted-ink)]">{llmStatus.loading ? '正在读取服务状态…' : llmStatus.data?.configured ? `对话服务：${llmStatus.data.provider}${llmStatus.data.model ? ` · ${llmStatus.data.model}` : ''}` : '外部模型未配置，当前回答由课程材料与学习记录生成'}</p>{speech.error ? <p className="text-[10px] text-rose-600">{speech.error}</p> : null}</div></details>
          </div>
        </GlassPanel></div>
      </div>
  );
}

export function XiaolianPage() {
  return (
    <AppShell>
      <XiaolianWorkspace />
    </AppShell>
  );
}
