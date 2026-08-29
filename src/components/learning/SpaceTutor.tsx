import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';
import { useAgentChat } from '@/lib/hooks';
import type { AgentChatResponse, KnowledgePointContent, KnowledgeSource } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { XiaolianCharacter } from '@/components/xiaolian/XiaolianCharacter';
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
  /** 点击消息内"课程来源 · N"时打开来源面板。 */
  onOpenSources?: (sources: KnowledgeSource[]) => void;
  /** 语音播放状态上抛，供页面级 Live2D 陪伴角色联动口型。 */
  onSpeakingChange?: (speaking: boolean) => void;
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
  onOpenSources,
  onSpeakingChange,
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
  useEffect(() => { onSpeakingChange?.(speech.speaking); }, [speech.speaking, onSpeakingChange]);
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
    scrollRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
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
    <section className="flex flex-col" aria-label="小涟陪学席对话">
      <div className="flex items-center gap-3 px-1 pb-3">
        <XiaolianCharacter state={pending ? 'thinking' : messages.length > 1 ? 'encourage' : 'idle'} size="sm" speaking={speech.speaking} />
        <div className="min-w-0 text-left">
          <h2 className="text-sm font-bold">小涟陪学席</h2>
          <p className="mt-0.5 truncate text-[11px] text-[var(--em-muted-ink)]">真实 Tutor Agent · 当前任务上下文</p>
        </div>
        {pending && <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50/60 px-3 py-1 text-[11px] font-medium text-[var(--em-muted-ink)]"><Loader2 className="h-3.5 w-3.5 animate-spin" />正在协调学习能力…</span>}
      </div>

      <div ref={scrollRef} className="space-y-4 px-1 pb-4">
        {messages.map((message) => <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[92%] text-[13px] leading-relaxed', message.role === 'user' ? 'rounded-[18px] bg-primary-500 px-3.5 py-2.5 text-white' : 'text-[var(--em-ink)]')}>
          {message.response ? <TutorExplanationCard response={message.response} knowledge={knowledge ?? null} knowledgePointName={topic} onOpenSources={onOpenSources} /> : <>{message.role === 'assistant' && <div className="mb-1 flex items-center gap-1 text-[10px] text-primary-600"><Sparkles className="h-2.5 w-2.5" />小涟</div>}<p className="whitespace-pre-line">{message.content}</p></>}
          {message.role === 'assistant' && <SpeechControls text={message.content} supported={speech.supported} speaking={speech.speaking} mode={speech.mode} onSpeak={speech.speak} onStop={speech.stop} className="mt-2" />}
        </div></div>)}
      </div>

      <div className="sticky bottom-20 space-y-2 lg:bottom-4">
        {quickQuestions && quickQuestions.length > 0 && <div className="flex flex-wrap gap-1.5 px-1">{quickQuestions.map((question) => <button key={question} type="button" disabled={pending} onClick={() => void handleSend(question)} className="rounded-full border border-violet-200 bg-violet-50/60 px-2.5 py-1 text-[11px] font-medium text-primary-700 backdrop-blur hover:bg-violet-100 disabled:opacity-50">{question}</button>)}</div>}
        <form className="flex items-start gap-2 rounded-[22px] border border-violet-100 bg-[var(--em-glass-bg)] p-2.5 shadow-[var(--em-glass-shadow)] backdrop-blur-xl" onSubmit={(event) => { event.preventDefault(); void handleSend(); }}><Input value={input} onChange={(event) => setInput(event.target.value)} placeholder={`问问小涟「${topic}」…`} className="h-9 rounded-xl border-0 bg-transparent text-[13px] focus-visible:ring-0" disabled={pending} /><VoiceInputButton supported={voice.supported} listening={voice.listening} interimTranscript={voice.interimTranscript} error={voice.error} disabled={pending} compact onStart={() => { speech.stop(); voice.start(); }} onStop={voice.stop} className="shrink-0" /><Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-xl bg-primary-500" disabled={pending || !input.trim()} aria-label="发送"><Send className="h-3.5 w-3.5" /></Button></form>
      </div>
    </section>
  );
}
