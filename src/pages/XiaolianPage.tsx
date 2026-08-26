import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
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
import { VoiceAttributionNotice } from '@/components/digital-human/VoiceAttributionNotice';
import { VoiceInputButton } from '@/components/digital-human/VoiceInputButton';
import { useSpeechRecognition } from '@/components/digital-human/useSpeechRecognition';
import { useSpeechSynthesis } from '@/components/digital-human/useSpeechSynthesis';
import {
  ACTIVE_COURSE_ID,
  ACTIVE_LEARNER_ID,
  useXiaolianRuntimeStore,
} from '@/store';

const CAPABILITIES: Array<{ capability: AgentCapability; label: string; question: string }> = [
  { capability: 'diagnosis', label: '学习诊断', question: '我现在学得怎么样？' },
  { capability: 'planning', label: '学习规划', question: '我今天应该学什么？' },
  { capability: 'tutoring', label: '学习辅导', question: '给我解释死锁四个必要条件。' },
  { capability: 'assessment', label: '学习评估', question: '分析一下我刚才的练习。' },
];
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

export function XiaolianWorkspace({ embedded = false }: { embedded?: boolean }) {
  const llmStatus = useLlmStatus();
  const speech = useSpeechSynthesis();
  const [messages, setMessages] = useState<ChatMessage[]>([
    assistantMessage('你好，我是昔涟教官。\n我会结合真实学习证据，为你明确目标、讲清知识、组织训练并完成复盘。'),
  ]);
  const [input, setInput] = useState('');
  const voice = useSpeechRecognition({
    onFinalTranscript: (transcript) => {
      setInput((current) => [current.trim(), transcript].filter(Boolean).join(' '));
    },
  });
  const [selectedCapability, setSelectedCapability] = useState<AgentCapability | null>(null);
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

  const handleSend = async (rawText?: string, capability?: AgentCapability | null) => {
    const text = (rawText ?? input).trim();
    if (!text || pending) return;
    voice.stop();
    speech.stop();
    const requestedCapability = capability === undefined ? selectedCapability : capability;
    setInput('');
    setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'user', content: text }]);
    setPending(true);
    setRuntimeState('thinking');
    setCompanionState('companion');
    try {
      const result: AgentChatResponse = await chatWithAgents({
        learnerId: ACTIVE_LEARNER_ID,
        courseId: ACTIVE_COURSE_ID,
        message: text,
        capability: requestedCapability,
      });
      setSelectedCapability(null);
      setMessages((previous) => [...previous, assistantMessage(result.answer, {
        contextUsed: result.contextUsed,
        isFallback: result.responseMode === 'fallback',
        suggestedActions: result.suggestedActions.map((action) => action.label),
        agentTrace: result.agentTrace,
        sources: result.sources,
        provider: result.provider,
        model: result.model,
      })]);
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

  return (
      <div
        data-agent-workspace={embedded ? 'embedded' : 'full'}
        className={cn(
          'mx-auto max-w-5xl',
          embedded ? 'min-h-[calc(100vh-5.5rem)]' : 'min-h-[calc(100vh-8rem)]',
        )}
      >
        <GlassPanel className={cn('flex flex-col overflow-hidden', embedded ? 'min-h-[calc(100vh-5.5rem)] rounded-[22px]' : 'min-h-[720px]')}>
          <div className="border-b border-violet-100 p-5">
            <div className="flex items-center gap-4">
              <XiaolianCharacter runtimeState={runtimeState} companionState={companionState} size="md" speaking={speech.speaking} />
              <div>
                <h1 className="text-xl font-bold">AI 教官工作台</h1>
                <p className="mt-1 text-xs text-[var(--em-muted-ink)]">让昔涟教官讲解、训练、考核或复盘；执行详情默认折叠，需要时再展开。</p>
              </div>
            </div>
            <XiaolianMessage tone={pending ? 'observe' : companionState === 'encouraging' ? 'encourage' : 'suggest'} compact className="mt-4">
              {pending ? '我正在结合真实学习状态制定教学响应。' : '先告诉我目标或卡点，我会给出讲解、检查理解与下一步任务。'}
            </XiaolianMessage>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CAPABILITIES.map((item) => <button key={item.capability} type="button" disabled={pending} onClick={() => { setSelectedCapability(item.capability); setInput(item.question); }} className={cn('rounded-[16px] border px-3 py-2 text-left text-xs transition disabled:opacity-50', selectedCapability === item.capability ? 'border-primary-300 bg-violet-50 text-primary-700' : 'border-violet-100 bg-white/55 text-[var(--em-muted-ink)] hover:border-primary-200')}><strong>{item.label}</strong><span className="mt-0.5 block text-[9px]">点击预填问题</span></button>)}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.map((message) => <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[90%] rounded-[20px] px-4 py-3 text-sm leading-relaxed sm:max-w-[82%]', message.role === 'user' ? 'bg-primary-500 text-white' : 'border border-violet-100 bg-white/65 text-[var(--em-ink)]')}>
              {message.role === 'assistant' && <div className="mb-2 flex items-center gap-1.5 text-[11px] text-primary-600"><Sparkles className="h-3 w-3" />小涟{message.isFallback && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">基础辅导模式</span>}</div>}
              <p className="whitespace-pre-line">{message.content}</p>
              {message.role === 'assistant' && <SpeechControls text={message.content} supported={speech.supported} speaking={speech.speaking} mode={speech.mode} onSpeak={speech.speak} onStop={speech.stop} className="mt-3" />}
              {message.role === 'assistant' && message.contextUsed && message.contextUsed.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5 border-t border-violet-100 pt-2"><span className="text-[11px] text-[var(--em-muted-ink)]">已参考：</span>{message.contextUsed.map((key) => <span key={key} className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-primary-700">{CONTEXT_LABELS[key] ?? key}</span>)}</div>}
              {message.role === 'assistant' && message.suggestedActions?.length ? <div className="mt-3 border-t border-violet-100 pt-2"><p className="text-[11px] font-semibold text-[var(--em-muted-ink)]">下一步建议</p>{message.suggestedActions.map((action) => <p key={action} className="mt-1 text-xs text-[var(--em-muted-ink)]">· {action}</p>)}</div> : null}
              {message.role === 'assistant' && (message.agentTrace || message.sources) && <AgentToolTrace items={message.agentTrace ?? []} sources={message.sources ?? []} />}
              {message.role === 'assistant' && message.provider && <p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">Provider：{message.provider}{message.model ? ` · ${message.model}` : ' · 基础辅导'}</p>}
            </div></div>)}
            {pending && <div className="rounded-[20px] border border-violet-100 bg-white/65 px-4 py-3 text-sm text-[var(--em-muted-ink)]">小涟正在协调学习能力…</div>}
          </div>

          <div className="border-t border-violet-100 p-4">
            <p className="mb-3 text-[10px] text-[var(--em-muted-ink)]">{llmStatus.loading ? '正在读取服务状态…' : llmStatus.data?.configured ? `Provider：${llmStatus.data.provider}${llmStatus.data.model ? ` · ${llmStatus.data.model}` : ''}` : '外部模型未配置，当前回答由课程材料与学习记录生成'}</p>
            <div className="mb-3 flex flex-wrap gap-2">{QUICK_QUESTIONS.map((question) => <button key={question} type="button" disabled={pending} onClick={() => void handleSend(question, null)} className="rounded-full border border-violet-200 bg-violet-50/65 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-violet-100 disabled:opacity-50">{question}</button>)}</div>
            <VoiceAttributionNotice mode={speech.mode} provider={speech.provider} error={speech.error} className="mb-3" />
            <form className="flex items-start gap-2" onSubmit={(event) => { event.preventDefault(); void handleSend(); }}><Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="向小涟提问，例如：为什么我总学不会死锁？" className="h-11 flex-1 rounded-2xl bg-white/70" disabled={pending} /><VoiceInputButton supported={voice.supported} listening={voice.listening} interimTranscript={voice.interimTranscript} error={voice.error} disabled={pending} compact onStart={() => { speech.stop(); voice.start(); }} onStop={voice.stop} className="shrink-0" /><Button type="submit" disabled={pending || !input.trim()} size="icon" className="h-11 w-11 shrink-0 rounded-2xl bg-primary-500" aria-label="发送"><Send className="h-4 w-4" /></Button></form>
            <p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">语音仅填入输入框，确认文字后再发送；音频不会上传到 EducationMind 后端。</p>
          </div>
        </GlassPanel>
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
