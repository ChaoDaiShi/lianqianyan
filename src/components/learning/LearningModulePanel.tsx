import { ArrowRight, Activity, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { KnowledgePointDiagnosis, PersistedStudyTask } from '@/domain';
import { ACTION_TYPE_LABEL, DIAGNOSIS_STATUS_LABEL } from '@/domain';
import type { KnowledgePointContent } from '@/lib/educationApi';
import { GlassPanel } from '@/components/design/GlassPanel';
import { buildReflectionHref } from '@/components/learning/reflectionPresentation';

interface LearningModulePanelProps {
  task: PersistedStudyTask;
  knowledge: KnowledgePointContent | null;
  knowledgeLoading: boolean;
  knowledgeError: boolean;
  diagnosis: KnowledgePointDiagnosis | null;
  diagnosisLoading: boolean;
  diagnosisError: boolean;
}

export function LearningModulePanel({
  task,
  knowledge,
  knowledgeLoading,
  knowledgeError,
  diagnosis,
  diagnosisLoading,
  diagnosisError,
}: LearningModulePanelProps) {
  const reflectionHref = buildReflectionHref(task);
  const sectionTitles = knowledge?.sections
    .map((section) => section.title.trim())
    .filter(Boolean) ?? [];

  return (
    <GlassPanel className="p-5 xl:sticky xl:top-24">
      <p className="text-[10px] font-semibold tracking-[0.18em] text-primary-600">学习单元</p>
      <h2 className="mt-2 flex items-center gap-2 text-base font-bold"><BookOpen className="h-4 w-4 text-primary-600" />{ACTION_TYPE_LABEL[task.actionType]}「{task.knowledgePointName}」</h2>
      {sectionTitles.length > 0 && (
        <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">课程章节：{sectionTitles.join('、')}</p>
      )}
      {knowledgeLoading && <p className="mt-2 text-xs text-[var(--em-muted-ink)]">正在读取课程内容…</p>}
      {knowledgeError && <p className="mt-2 text-xs text-amber-700">课程内容暂时未加载，不使用静态内容替代。</p>}

      <section className="mt-4 rounded-2xl bg-white/55 p-3">
        <p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><Activity className="h-4 w-4" />诊断状态</p>
        <p className="mt-1 text-sm font-semibold">{diagnosisLoading ? '正在读取诊断' : diagnosisError ? '诊断暂不可用' : diagnosis ? DIAGNOSIS_STATUS_LABEL[diagnosis.status] : '诊断未返回此知识点状态'}</p>
        {!diagnosisLoading && !diagnosisError && diagnosis && <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">{diagnosis.evidenceCount} 条评价证据{diagnosis.status === 'unassessed' || diagnosis.status === 'insufficient_evidence' ? '，暂不显示掌握度' : ` · 掌握度 ${Math.round(diagnosis.masteryScore * 100)}%`}</p>}
      </section>

      <Link to={reflectionHref} className="mt-4 flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-sm font-semibold text-primary-700 transition hover:bg-violet-100">
        用自己的话复述
        <ArrowRight className="h-4 w-4" />
      </Link>
    </GlassPanel>
  );
}
