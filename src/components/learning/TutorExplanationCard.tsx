import { BookOpen, Brain, Lightbulb, Sparkles } from 'lucide-react';
import type { AgentChatResponse, KnowledgePointContent } from '@/lib/educationApi';
import { AgentToolTrace } from './AgentToolTrace';
import { SourceReferences } from './SourceReferences';

interface TutorExplanationCardProps {
  response: AgentChatResponse;
  knowledge: KnowledgePointContent | null;
  knowledgePointName: string;
}

export function TutorExplanationCard({ response, knowledge, knowledgePointName }: TutorExplanationCardProps) {
  const memoryAnchors = knowledge?.sections
    .map((section) => section.title.trim())
    .filter(Boolean) ?? [];

  return (
    <article>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-primary-600"><Sparkles className="h-3 w-3" />小涟讲解{response.responseMode === 'fallback' && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">基础辅导模式</span>}</div>
      <h3 className="text-sm font-bold">{knowledge?.title ?? knowledgePointName}</h3>

      <section className="mt-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-primary-700"><Brain className="h-3 w-3" />分步骤解释</p>
        <p className="mt-1 text-[10px] leading-4 text-[var(--em-muted-ink)]">以下直接展示 Agent 返回原文；步骤结构以原文为准。</p>
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed">{response.answer}</p>
      </section>

      <section className="mt-3 border-t border-violet-100 pt-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-sky-700"><BookOpen className="h-3 w-3" />核心知识点</p>
        {knowledge?.sections.length ? <div className="mt-2 space-y-2">{knowledge.sections.map((section) => <div key={section.title} className="rounded-xl bg-sky-50/55 px-3 py-2"><p className="text-[11px] font-semibold text-sky-800">{section.title}</p><p className="mt-1 text-[11px] leading-5 text-[var(--em-muted-ink)]">{section.content}</p></div>)}</div> : <p className="mt-2 text-[11px] leading-5 text-[var(--em-muted-ink)]">当前课程内容没有返回可展示的核心章节。</p>}
      </section>

      <section className="mt-3 rounded-xl bg-amber-50/60 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-amber-700"><Lightbulb className="h-3 w-3" />记忆提示</p>
        {memoryAnchors.length > 0
          ? <p className="mt-1 text-[11px] leading-5 text-amber-900">课程章节：{memoryAnchors.join('、')}</p>
          : <p className="mt-1 text-[11px] leading-5 text-amber-900">当前 Knowledge Content 未返回可展示的记忆提示。</p>}
      </section>

      {response.contextUsed.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5 border-t border-violet-100 pt-2"><span className="text-[10px] text-[var(--em-muted-ink)]">回答使用上下文：</span>{response.contextUsed.map((key) => <span key={key} className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] text-primary-700">{key}</span>)}</div>}
      <SourceReferences sources={response.sources} />
      <AgentToolTrace items={response.agentTrace} compact />
      <p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">Provider：{response.provider}{response.model ? ` · ${response.model}` : ' · 本地演示'}</p>
    </article>
  );
}
