import { useEffect, useRef, useState } from 'react';
import { Brain, ChevronDown, Loader2, Send, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { StreamingResponse } from '@/components/xiaolian/StreamingResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownText } from '@/components/content/MarkdownText';
import { AgentToolTrace } from '@/components/learning/AgentToolTrace';
import type {
  AgentCapability,
  AgentChatResponse,
  AgentTraceItem,
  KnowledgeSource,
} from '@/lib/educationApi';
import {
  cancelAgentStream,
  initialAgentStreamState,
  reduceAgentStream,
  streamAgentChat,
  type AgentStreamState,
} from '@/lib/agentStream';
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
import { NextStepGuidanceCard } from '@/components/learning/NextStepGuidance';

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
  streamState?: AgentStreamState;
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

function fromAgentResult(
  id: string,
  result: AgentChatResponse,
): ChatMessage {
  return {
    id,
    role: 'assistant',
    content: result.answer,
    contextUsed: result.contextUsed,
    isFallback: result.responseMode === 'fallback',
    suggestedActions: result.suggestedActions.map((action) => action.label),
    agentTrace: result.agentTrace,
    sources: result.sources,
    provider: result.provider,
    model: result.model,
  };
}

interface PendingStreamRequest {
  text: string;
  capability: AgentCapability | null;
  threadId: string;
  draftId: string;
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
  const activeAbortRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<PendingStreamRequest | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending]);
  useEffect(
    () => () => {
      activeAbortRef.current?.abort();
      resetRuntime();
    },
    [resetRuntime],
  );

  const applyThread = (thread: CompanionThread) => {
    setThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)]);
  };

  const openThread = (thread: CompanionThread) => {
    activeAbortRef.current?.abort();
    setPending(false);
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

  const updateStreamMessage = (
    draftId: string,
    streamState: AgentStreamState,
  ) => {
    setMessages((previous) =>
      previous.map((message) =>
        message.id === draftId
          ? { ...message, content: streamState.text, streamState }
          : message,
      ),
    );
  };

  const runStream = async (
    request: PendingStreamRequest,
    { persistUser }: { persistUser: boolean },
  ) => {
    const controller = new AbortController();
    activeAbortRef.current?.abort();
    activeAbortRef.current = controller;
    let streamState = initialAgentStreamState();
    updateStreamMessage(request.draftId, streamState);
    setPending(true);
    setRuntimeState('thinking');
    setCompanionState('companion');

    try {
      if (persistUser) {
        try {
          applyThread(
            await appendCompanionMessage(request.threadId, {
              role: 'user',
              content: request.text,
            }),
          );
        } catch {
          setHistoryError('这条提问尚未保存到历史记录，可稍后重试。');
        }
      }

      const result = await streamAgentChat(
        {
          learnerId: ACTIVE_LEARNER_ID,
          courseId: ACTIVE_COURSE_ID,
          message: request.text,
          capability: request.capability,
          threadId: request.threadId,
        },
        {
          signal: controller.signal,
          onEvent: (event) => {
            streamState = reduceAgentStream(streamState, event);
            updateStreamMessage(request.draftId, streamState);
          },
        },
      );

      setMessages((previous) =>
        previous.map((message) =>
          message.id === request.draftId
            ? fromAgentResult(request.draftId, result)
            : message,
        ),
      );
      try {
        applyThread(
          await appendCompanionMessage(request.threadId, {
            role: 'assistant',
            content: result.answer,
            context_used: result.contextUsed,
            suggested_actions: result.suggestedActions.map(
              (action) => action.label,
            ),
            provider: result.provider,
            model: result.model,
          }),
        );
      } catch {
        setHistoryError('回答已显示，但尚未保存到历史记录。');
      }
      setCompanionState('encouraging');
    } catch {
      if (controller.signal.aborted) {
        streamState = cancelAgentStream(streamState);
      } else if (streamState.status !== 'error') {
        streamState = reduceAgentStream(streamState, {
          type: 'error',
          message: '连接暂时中断，已保留收到的内容。',
        });
      }
      updateStreamMessage(request.draftId, streamState);
      setCompanionState('companion');
    } finally {
      if (activeAbortRef.current === controller) {
        activeAbortRef.current = null;
        setPending(false);
        setRuntimeState('idle');
      }
    }
  };

  const handleSend = (
    rawText?: string,
    capability?: AgentCapability | null,
  ) => {
    const text = (rawText ?? input).trim();
    if (!text || pending || !activeThreadId) return;
    voice.stop();
    speech.stop();
    setInput('');
    const draftId = crypto.randomUUID();
    const request: PendingStreamRequest = {
      text,
      capability: capability ?? null,
      threadId: activeThreadId,
      draftId,
    };
    lastRequestRef.current = request;
    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: 'user', content: text },
      assistantMessage('', {
        id: draftId,
        streamState: initialAgentStreamState(),
      }),
    ]);
    void runStream(request, { persistUser: true });
  };

  const retryStream = (draftId: string) => {
    const request = lastRequestRef.current;
    if (!request || request.draftId !== draftId || pending) return;
    setMessages((previous) =>
      previous.map((message) =>
        message.id === draftId
          ? { ...message, content: '', streamState: initialAgentStreamState() }
          : message,
      ),
    );
    void runStream(request, { persistUser: false });
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
        <div className="grid min-w-0 gap-3 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="order-2 min-w-0 space-y-3 xl:order-1">
          <ConversationRail threads={threads} activeId={activeThreadId} onCreate={() => void createThread()} onSelect={(id) => { const thread = threads.find((item) => item.id === id); if (thread) openThread(thread); }} onDelete={(id) => void removeThread(id)} />
          {activeThread ? <LongTermMemoryPanel memories={activeThread.memories} busy={memoryBusy} onAdd={(content) => void remember(content)} onDelete={(id) => void forget(id)} /> : null}
          <NextStepGuidanceCard />
          {historyLoading ? <p className="flex items-center gap-2 px-3 text-xs text-[var(--em-muted-ink)]"><Loader2 className="h-3.5 w-3.5 animate-spin" />读取历史记录…</p> : null}
          {historyError ? <p role="status" className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-800">{historyError}</p> : null}
        </div>
        <GlassPanel className={cn('order-1 flex h-[calc(100dvh-5.4rem)] min-h-[36rem] min-w-0 flex-col overflow-hidden rounded-[2rem] xl:order-2', embedded && 'h-[calc(100dvh-4.5rem)]')}>
          <header className="border-b border-violet-100 px-4 py-2.5 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <XiaolianCharacter runtimeState={runtimeState} companionState={companionState} size="sm" speaking={speech.speaking} />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-primary-700">XIAOLIAN CONVERSATION</p>
                  <h1 className="mt-0.5 truncate text-lg font-bold">和小涟一起想明白</h1>
                  <p className="mt-0.5 hidden text-xs text-[var(--em-muted-ink)] sm:block">说出目标或卡点，从历史与主动保存的记忆继续。</p>
                </div>
              </div>
              <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold', pending ? 'border-primary-200 bg-violet-50 text-primary-700' : 'border-emerald-100 bg-emerald-50/70 text-emerald-700')}>
                {pending ? <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" /> : <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                <span className="hidden sm:inline">
                  {pending ? '协作流进行中' : '证据范围已锁定'}
                </span>
                <span className="sm:hidden">{pending ? '生成中' : '就绪'}</span>
              </span>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.map((message) => {
              const streaming =
                message.role === 'assistant' &&
                message.streamState &&
                message.streamState.status !== 'complete';
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  {streaming && message.streamState ? (
                    <div className="w-full max-w-[96%] sm:max-w-[88%]">
                      <StreamingResponse
                        state={message.streamState}
                        onStop={() => activeAbortRef.current?.abort()}
                        onRetry={() => retryStream(message.id)}
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'max-w-[92%] rounded-[22px] px-4 py-3 text-sm leading-relaxed sm:max-w-[82%]',
                        message.role === 'user'
                          ? 'bg-primary-600 text-white shadow-[0_10px_26px_rgba(111,95,224,0.18)]'
                          : 'border border-violet-100 bg-white/70 text-[var(--em-ink)] shadow-[0_12px_32px_rgba(76,62,132,0.06)]',
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-primary-600">
                          <Sparkles className="h-3 w-3" />
                          小涟
                          {message.isFallback && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                              基础辅导模式
                            </span>
                          )}
                        </div>
                      )}
                      <MarkdownText content={message.content} />
                      {message.role === 'assistant' && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <SpeechControls
                            text={message.content}
                            supported={speech.supported}
                            speaking={speech.speaking}
                            mode={speech.mode}
                            onSpeak={speech.speak}
                            onStop={speech.stop}
                          />
                          <button
                            type="button"
                            disabled={memoryBusy}
                            onClick={() =>
                              void remember(message.content, message.id)
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50/70 px-2.5 py-1 text-[10px] font-semibold text-primary-700"
                          >
                            <Brain className="h-3 w-3" />
                            记住这条
                          </button>
                        </div>
                      )}
                      {message.role === 'assistant' &&
                      (message.contextUsed?.length ||
                        message.suggestedActions?.length ||
                        message.agentTrace?.length ||
                        message.sources?.length ||
                        message.provider) ? (
                        <details className="group mt-3 border-t border-violet-100 pt-2">
                          <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] text-[var(--em-muted-ink)]">
                            <span>回答依据与下一步</span>
                            <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                          </summary>
                          <div className="mt-3 space-y-3">
                            {message.contextUsed &&
                              message.contextUsed.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="text-[11px] text-[var(--em-muted-ink)]">
                                    已参考：
                                  </span>
                                  {message.contextUsed.map((key) => (
                                    <span
                                      key={key}
                                      className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-primary-700"
                                    >
                                      {CONTEXT_LABELS[key] ?? key}
                                    </span>
                                  ))}
                                </div>
                              )}
                            {message.suggestedActions?.length ? (
                              <div>
                                <p className="text-[11px] font-semibold text-[var(--em-muted-ink)]">
                                  下一步建议
                                </p>
                                {message.suggestedActions.map((action) => (
                                  <p
                                    key={action}
                                    className="mt-1 text-xs text-[var(--em-muted-ink)]"
                                  >
                                    · {action}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                            {(message.agentTrace || message.sources) && (
                              <AgentToolTrace
                                items={message.agentTrace ?? []}
                                sources={message.sources ?? []}
                                compact
                              />
                            )}
                            {message.provider && (
                              <p className="text-[10px] text-[var(--em-muted-ink)]">
                                对话服务：{message.provider}
                                {message.model
                                  ? ` · ${message.model}`
                                  : ' · 基础辅导'}
                              </p>
                            )}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
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
