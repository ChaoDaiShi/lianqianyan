import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';
import { useAgentChat } from '@/lib/hooks';
import type { AgentChatResponse, KnowledgePointContent } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/design/GlassPanel';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
import { XiaolianMessage } from '@/components/xiaolian/XiaolianMessage';
import { TutorExplanationCard } from './TutorExplanationCard';
import { SpeechControls } from '@/components/digital-human/SpeechControls';
import { VoiceInputButton } from '@/components/digital-human/VoiceInputButton';
import { useSpeechRecognition } from '@/components/digital-human/useSpeechRecognition';
import { useSpeechSynthesis } from '@/components/digital-human/useSpeechSynthesis';

interface SpaceTutorProps {
  knowledgePointId?: string;
  knowledgePointName?: string;
  knowledge?: KnowledgePointContent | null;
  quickQuestions?: string[];
  onPendingChange?: (pending: boolean) => void;
  onResponse?: (response: AgentChatResponse) => void;
}

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: AgentChatResponse;
}

export function SpaceTutor({
  knowledgePointId,
  knowledgePointName,
  knowledge,
  quickQuestions,
  onPendingChange,
  onResponse,
}: SpaceTutorProps) {
  const { send, pending } = useAgentChat(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID, knowledgePointId);
  const [messages, setMessages] = useState<Msg[]>(() =>
    knowledgePointName
      ? [
          {
            id: `welcome-${knowledgePointId ?? 'general'}`,
            role: 'assistant',
            content: `我是小涟。你现在正在学习「${knowledgePointName}」。\n如果某个概念没理解，可以直接问我。`,
          },
        ]
      : [],
  );
  const [input, setInput] = useState('');
  const voice = useSpeechRecognition({
    onFinalTranscript: (transcript) => {
      setInput((current) => [current.trim(), transcript].filter(Boolean).join(' '));
    },
  });
  const speech = useSpeechSynthesis();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const requestGenerationRef = useRef(0);
  const topic = knowledgePointName ?? '这个知识点';

  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  useEffect(() => {
    requestGenerationRef.current += 1;
    voice.stop();
    speech.stop();
    setInput('');
    if (knowledgePointName) {
      setMessages([{ id: `welcome-${knowledgePointId ?? 'general'}`, role: 'assistant', content: `我是小涟。你现在正在学习「${knowledgePointName}」。\n如果某个概念没理解，可以直接问我。` }]);
    } else {
      setMessages([]);
    }
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [knowledgePointId, knowledgePointName, speech.stop, voice.stop]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending]);

  const handleSend = async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || pending) return;
    voice.stop();
    speech.stop();
    const requestGeneration = ++requestGenerationRef.current;
    setInput('');
    setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'user', content: text }]);
    const result = await send(text);
    if (requestGeneration !== requestGenerationRef.current) return;
    if (!result) {
      setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: '小涟暂时无法连接，请稍后再试。' }]);
      return;
    }
    onResponse?.(result);
    setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: result.answer, response: result }]);
  };

  return (
    <GlassPanel className="flex min-h-[560px] flex-col overflow-hidden">
      <div className="border-b border-violet-100 bg-gradient-to-b from-violet-50/80 to-transparent p-4 text-center">
        <XiaolianCharacter state={pending ? 'thinking' : messages.length > 1 ? 'encourage' : 'idle'} size="md" speaking={speech.speaking} />
        <h2 className="mt-1 text-sm font-bold">小涟陪学席</h2>
        <p className="mt-0.5 text-[11px] text-[var(--em-muted-ink)]">真实 Tutor Agent · 当前任务上下文</p>
        <XiaolianMessage tone={pending ? 'observe' : 'encourage'} compact className="mt-3 text-left">{pending ? '我正在调用真实学习能力，返回后可展开查看能力节点与课程来源。' : `我们一起读懂「${topic}」，有不清楚的地方就告诉我。`}</XiaolianMessage>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[92%] rounded-[18px] px-3 py-2.5 text-[13px] leading-relaxed', message.role === 'user' ? 'bg-primary-500 text-white' : 'border border-violet-100 bg-white/65 text-[var(--em-ink)]')}>
          {message.response ? <TutorExplanationCard response={message.response} knowledge={knowledge ?? null} knowledgePointName={topic} /> : <>{message.role === 'assistant' && <div className="mb-1 flex items-center gap-1 text-[10px] text-primary-600"><Sparkles className="h-2.5 w-2.5" />小涟</div>}<p className="whitespace-pre-line">{message.content}</p></>}
          {message.role === 'assistant' && <SpeechControls text={message.content} supported={speech.supported} speaking={speech.speaking} onSpeak={speech.speak} onStop={speech.stop} className="mt-2" />}
        </div></div>)}
        {pending && <div className="flex items-center gap-2 rounded-2xl bg-white/65 px-3 py-2 text-xs text-[var(--em-muted-ink)]"><Loader2 className="h-3.5 w-3.5 animate-spin" />小涟正在协调学习能力…</div>}
      </div>

      {quickQuestions && quickQuestions.length > 0 && <div className="flex flex-wrap gap-1.5 border-t border-violet-100 px-4 py-3">{quickQuestions.map((question) => <button key={question} type="button" disabled={pending} onClick={() => void handleSend(question)} className="rounded-full border border-violet-200 bg-violet-50/60 px-2.5 py-1 text-[11px] font-medium text-primary-700 hover:bg-violet-100 disabled:opacity-50">{question}</button>)}</div>}
      <form className="flex items-start gap-2 border-t border-violet-100 p-3" onSubmit={(event) => { event.preventDefault(); void handleSend(); }}><Input value={input} onChange={(event) => setInput(event.target.value)} placeholder={`问问小涟「${topic}」…`} className="h-9 rounded-xl bg-white/70 text-[13px]" disabled={pending} /><VoiceInputButton supported={voice.supported} listening={voice.listening} interimTranscript={voice.interimTranscript} error={voice.error} disabled={pending} compact onStart={() => { speech.stop(); voice.start(); }} onStop={voice.stop} className="shrink-0" /><Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-xl bg-primary-500" disabled={pending || !input.trim()} aria-label="发送"><Send className="h-3.5 w-3.5" /></Button></form>
    </GlassPanel>
  );
}
