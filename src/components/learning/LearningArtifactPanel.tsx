import { BookOpen, CheckCircle2, Compass, FileText, Loader2, Quote } from 'lucide-react';
import type { KnowledgePointDiagnosis } from '@/domain';
import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import type {
  KnowledgePointContent,
  KnowledgeSource,
  PracticeEvaluationResponse,
} from '@/lib/educationApi';
import { GlassPanel } from '@/components/design/GlassPanel';
import { SourceReferences } from './SourceReferences';

interface LearningArtifactPanelProps {
  knowledge: KnowledgePointContent | null;
  knowledgeLoading: boolean;
  knowledgeError: boolean;
  currentDiagnosis: KnowledgePointDiagnosis | null;
  isPrimaryFocus: boolean;
  sources: KnowledgeSource[];
  evaluation: PracticeEvaluationResponse | null;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function LearningArtifactPanel({
  knowledge,
  knowledgeLoading,
  knowledgeError,
  currentDiagnosis,
  isPrimaryFocus,
  sources,
  evaluation,
}: LearningArtifactPanelProps) {
  return (
    <GlassPanel className="overflow-hidden p-5">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-star" />
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-primary-600">LEARNING ARTIFACTS</p>
          <h2 className="text-lg font-bold">学习产物</h2>
        </div>
      </div>

      <section className="mt-5 rounded-[20px] border border-violet-100 bg-white/55 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-primary-700">
          <BookOpen className="h-4 w-4" />知识总结
        </p>
        {knowledgeLoading && <p className="mt-3 flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><Loader2 className="h-3.5 w-3.5 animate-spin" />正在读取课程知识…</p>}
        {!knowledgeLoading && knowledgeError && <p className="mt-3 text-xs leading-5 text-amber-700">课程知识暂时没有加载成功，不使用静态内容替代。</p>}
        {!knowledgeLoading && !knowledgeError && !knowledge && <p className="mt-3 text-xs leading-5 text-[var(--em-muted-ink)]">当前没有可展示的课程知识内容。</p>}
        {knowledge && <div className="mt-3 space-y-3"><strong className="block text-sm">{knowledge.title}</strong>{knowledge.sections.map((section) => <div key={section.title}><p className="text-xs font-semibold">{section.title}</p><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">{section.content}</p></div>)}</div>}
      </section>

      <section className="mt-4 rounded-[20px] border border-sky-100 bg-white/55 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-sky-700"><Compass className="h-4 w-4" />当前重点</p>
        {currentDiagnosis ? <div className="mt-3"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{currentDiagnosis.knowledgePointName}</strong>{isPrimaryFocus && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">诊断主要关注</span>}</div><p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">{DIAGNOSIS_STATUS_LABEL[currentDiagnosis.status]} · {currentDiagnosis.evidenceCount} 条评价证据{currentDiagnosis.status === 'unassessed' || currentDiagnosis.status === 'insufficient_evidence' ? '，暂不显示掌握度' : ` · 掌握度 ${percent(currentDiagnosis.masteryScore)}`}</p></div> : <p className="mt-3 text-xs leading-5 text-[var(--em-muted-ink)]">当前知识点尚无诊断结果；未评估不代表薄弱。</p>}
      </section>

      <section className="mt-4 rounded-[20px] border border-amber-100 bg-white/55 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-amber-700"><Quote className="h-4 w-4" />来源引用</p>
        {sources.length > 0 ? <SourceReferences sources={sources} /> : <p className="mt-3 text-xs leading-5 text-[var(--em-muted-ink)]">小涟本次回复尚未返回课程来源。</p>}
      </section>

      <section className="mt-4 rounded-[20px] border border-emerald-100 bg-white/55 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />练习反馈</p>
        {evaluation ? <div className="mt-3"><p className="text-sm font-semibold">掌握度 {percent(evaluation.masteryBefore)} → {percent(evaluation.masteryAfter)}</p><p className="mt-1 text-xs text-[var(--em-muted-ink)]">置信度 {percent(evaluation.confidence)} · 共 {evaluation.evidenceCount} 条评价证据</p><p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">{evaluation.message}</p><p className="mt-2 text-xs font-medium text-emerald-700">{evaluation.replanning.status === 'performed' ? '当前计划已根据本次真实结果重新调整。' : evaluation.replanning.status === 'not_needed' ? '结果已记录，当前计划无需调整。' : '结果已记录，但计划调整未完成。'}</p></div> : <p className="mt-3 text-xs leading-5 text-[var(--em-muted-ink)]">提交一次真实练习后，这里会展示服务端返回的评价结果。</p>}
      </section>
    </GlassPanel>
  );
}
