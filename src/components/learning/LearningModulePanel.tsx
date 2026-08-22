import { ArrowRight, BookOpen, Clock3, Flag, Layers3, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { KnowledgePointDiagnosis, PersistedStudyTask } from '@/domain';
import { ACTION_TYPE_LABEL, DIAGNOSIS_STATUS_LABEL } from '@/domain';
import type { KnowledgePointContent } from '@/lib/educationApi';
import { GlassPanel } from '@/components/design/GlassPanel';
import { buildReflectionHref } from '@/components/learning/reflectionPresentation';

interface LearningModulePanelProps {
  task: PersistedStudyTask;
  taskCount: number;
  knowledge: KnowledgePointContent | null;
  knowledgeLoading: boolean;
  knowledgeError: boolean;
  diagnosis: KnowledgePointDiagnosis | null;
  diagnosisLoading: boolean;
  diagnosisError: boolean;
}

export function LearningModulePanel({
  task,
  taskCount,
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
      <p className="text-[10px] font-semibold tracking-[0.18em] text-primary-600">LEARNING MODULE</p>
      <h2 className="mt-2 text-xl font-bold">完整学习单元</h2>
      <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">所有信息来自当前计划任务、课程内容与诊断结果。</p>

      <div className="mt-5 space-y-3">
        <section className="rounded-2xl bg-white/55 p-3">
          <p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><BookOpen className="h-4 w-4" />当前知识点</p>
          <strong className="mt-1 block text-sm">{task.knowledgePointName}</strong>
          {knowledge && knowledge.title !== task.knowledgePointName && <p className="mt-1 text-xs leading-5 text-primary-700">课程内容：{knowledge.title}</p>}
          {knowledgeLoading && <p className="mt-1 text-xs text-[var(--em-muted-ink)]">正在读取课程内容…</p>}
          {knowledgeError && <p className="mt-1 text-xs text-amber-700">课程内容暂时未加载，不使用静态内容替代。</p>}
        </section>

        <section className="rounded-2xl bg-white/55 p-3">
          <p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><Target className="h-4 w-4" />学习目标</p>
          <p className="mt-1 text-sm font-semibold leading-6">{ACTION_TYPE_LABEL[task.actionType]}「{task.knowledgePointName}」</p>
          {sectionTitles.length > 0 && <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">课程内容范围：{sectionTitles.join('、')}</p>}
          {knowledgeLoading && <p className="mt-1 text-xs text-[var(--em-muted-ink)]">课程内容范围正在加载…</p>}
          {knowledgeError && <p className="mt-1 text-xs text-amber-700">课程内容范围暂不可用，不补充推测性目标。</p>}
          {knowledge && sectionTitles.length === 0 && <p className="mt-1 text-xs text-[var(--em-muted-ink)]">课程内容未返回可列出的章节范围。</p>}
          <p className="mt-1 text-[10px] leading-4 text-[var(--em-muted-ink)]">目标仅复述当前 StudyTask 动作与 KnowledgePointContent 范围，不代表目标已完成。</p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <section className="rounded-2xl bg-white/55 p-3"><p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><Clock3 className="h-4 w-4" />预计时间</p><strong className="mt-1 block text-sm">{task.estimatedMinutes} 分钟</strong></section>
          <section className="rounded-2xl bg-white/55 p-3"><p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><Layers3 className="h-4 w-4" />学习阶段</p><strong className="mt-1 block text-sm">第 {task.order} / {taskCount} 项</strong></section>
        </div>

        <section className="rounded-2xl bg-white/55 p-3">
          <p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><Flag className="h-4 w-4" />任务与诊断</p>
          <p className="mt-1 text-sm font-semibold">{ACTION_TYPE_LABEL[task.actionType]} · {diagnosisLoading ? '正在读取诊断' : diagnosisError ? '诊断暂不可用' : diagnosis ? DIAGNOSIS_STATUS_LABEL[diagnosis.status] : '诊断未返回此知识点状态'}</p>
          {!diagnosisLoading && !diagnosisError && diagnosis && <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">{diagnosis.evidenceCount} 条评价证据{diagnosis.status === 'unassessed' || diagnosis.status === 'insufficient_evidence' ? '，暂不显示掌握度' : ` · 掌握度 ${Math.round(diagnosis.masteryScore * 100)}%`}</p>}
        </section>
      </div>

      <Link to={reflectionHref} className="mt-4 flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-sm font-semibold text-primary-700 transition hover:bg-violet-100">
        用自己的话复述
        <ArrowRight className="h-4 w-4" />
      </Link>
    </GlassPanel>
  );
}
