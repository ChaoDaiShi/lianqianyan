import { BookOpen, Brain, Lightbulb, Sparkles } from 'lucide-react';
import type { AgentChatResponse, KnowledgePointContent } from '@/lib/educationApi';
import { GlassPanel } from '@/components/design/GlassPanel';
import { buildProactiveTeachingContent } from './companionFlow';
import { AgentToolTrace } from './AgentToolTrace';
import { SourceReferences } from './SourceReferences';

interface AgentTutorExplanationCardProps {
  mode?: 'agent';
  response: AgentChatResponse;
  knowledge: KnowledgePointContent | null;
  knowledgePointName: string;
}

interface KnowledgeTutorExplanationCardProps {
  mode: 'knowledge';
  response?: never;
  knowledge: KnowledgePointContent | null;
  knowledgePointName: string;
  loading: boolean;
  error: boolean;
}

type TutorExplanationCardProps =
  | AgentTutorExplanationCardProps
  | KnowledgeTutorExplanationCardProps;

export function TutorExplanationCard(props: TutorExplanationCardProps) {
  if (props.mode === 'knowledge') {
    const content = buildProactiveTeachingContent(props.knowledge);

    return (
      <GlassPanel className="p-5">
        <p className="flex items-center gap-2 text-xs font-semibold text-primary-700">
          <Sparkles className="h-4 w-4" />
          小涟课前引导
        </p>
        <h2 className="mt-2 text-lg font-bold">先抓住课程里的关键内容</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
          本卡片只整理 KnowledgePointContent，不替代真实 Tutor API 讲解。
        </p>

        {props.loading ? (
          <p className="mt-4 text-sm text-[var(--em-muted-ink)]">
            正在读取课程内容…
          </p>
        ) : props.error && !props.knowledge ? (
          <p className="mt-4 text-sm text-amber-700">
            课程内容暂时没有加载成功，不生成替代讲解。
          </p>
        ) : !content ? (
          <p className="mt-4 text-sm leading-6 text-[var(--em-muted-ink)]">
            当前没有可整理的真实课程章节。
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <section>
              <p className="flex items-center gap-2 text-xs font-semibold text-sky-700">
                <BookOpen className="h-4 w-4" />
                核心概念
              </p>
              <div className="mt-2 space-y-2">
                {content.coreConcepts.map((concept, index) => (
                  <div
                    key={`${concept.title}:${index}`}
                    className="rounded-lg border border-sky-100 bg-sky-50/55 p-3"
                  >
                    <strong className="text-sm text-sky-900">
                      {concept.title}
                    </strong>
                    <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">
                      {concept.content}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-violet-100 bg-violet-50/60 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-primary-700">
                <Brain className="h-4 w-4" />
                学习重点
              </p>
              <p className="mt-2 text-sm font-semibold">
                {content.learningFocus.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">
                {content.learningFocus.content}
              </p>
            </section>

            <section className="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                <Lightbulb className="h-4 w-4" />
                小涟提醒
              </p>
              <p className="mt-2 text-xs leading-5 text-amber-900">
                {content.reminder}
              </p>
            </section>
          </div>
        )}
      </GlassPanel>
    );
  }

  const { response, knowledge, knowledgePointName } = props;
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
        {knowledge?.sections.length ? <div className="mt-2 space-y-2">{knowledge.sections.map((section, index) => <div key={`${section.title}:${index}`} className="rounded-xl bg-sky-50/55 px-3 py-2"><p className="text-[11px] font-semibold text-sky-800">{section.title}</p><p className="mt-1 text-[11px] leading-5 text-[var(--em-muted-ink)]">{section.content}</p></div>)}</div> : <p className="mt-2 text-[11px] leading-5 text-[var(--em-muted-ink)]">当前课程内容没有返回可展示的核心章节。</p>}
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
      <p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">Provider：{response.provider}{response.model ? ` · ${response.model}` : ' · 基础辅导'}</p>
    </article>
  );
}
