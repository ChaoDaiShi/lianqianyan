import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Lightbulb, Quote, Sparkles, WandSparkles } from 'lucide-react';
import type { KnowledgePointDiagnosis, PersistedStudyTask } from '@/domain';
import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import type {
  KnowledgePointContent,
  KnowledgeSource,
  PracticeEvaluationResponse,
} from '@/lib/educationApi';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import { SourceReferences } from '@/components/learning/SourceReferences';
import { cn } from '@/lib/utils';

export type ArtifactScope = 'task' | 'point' | 'session';

export interface WorkspaceArtifactsPanelProps {
  scope: ArtifactScope;
  onScopeChange(scope: ArtifactScope): void;
  task: PersistedStudyTask;
  knowledge: KnowledgePointContent | null;
  knowledgeLoading: boolean;
  knowledgeError: boolean;
  currentDiagnosis: KnowledgePointDiagnosis | null;
  isPrimaryFocus: boolean;
  sources: KnowledgeSource[];
  practiceEvaluation: PracticeEvaluationResponse | null;
  reflection: ReflectionResult | null;
  evidenceLearningStarted: number;
  evidencePracticeEvaluated: number;
}

const SCOPES: Array<{ id: ArtifactScope; label: string }> = [
  { id: 'task', label: '当前任务' },
  { id: 'point', label: '当前知识点' },
  { id: 'session', label: '本次会话' },
];

const KIND_LABEL = {
  summary: '知识总结',
  feedback: '当前重点',
  practice: '练习结果',
  reflection: '复述结果',
  sources: '来源引用',
  resource: '生成资源',
} as const;

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN');
  } catch {
    return iso;
  }
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

/** 统一的产物外壳：类型 + 标题 + 时间 + 关联知识点 + 内容 + 可选操作。 */
function ArtifactCard({
  kind,
  title,
  timestamp,
  knowledgePoint,
  children,
  actions,
  tone = 'violet',
}: {
  kind: keyof typeof KIND_LABEL;
  title: string;
  timestamp?: string;
  knowledgePoint?: string;
  children: ReactNode;
  actions?: ReactNode;
  tone?: 'violet' | 'sky' | 'amber' | 'emerald' | 'fuchsia';
}) {
  const toneClass = {
    violet: 'border-violet-100 bg-white/55',
    sky: 'border-sky-100 bg-white/55',
    amber: 'border-amber-100 bg-white/55',
    emerald: 'border-emerald-100 bg-white/55',
    fuchsia: 'border-fuchsia-100 bg-white/55',
  }[tone];
  const iconClass = {
    violet: 'text-primary-600',
    sky: 'text-sky-600',
    amber: 'text-amber-700',
    emerald: 'text-emerald-600',
    fuchsia: 'text-fuchsia-600',
  }[tone];
  return (
    <section className={cn('rounded-[18px] border p-4', toneClass)}>
      <div className="flex items-center gap-2">
        <Sparkles className={cn('h-3.5 w-3.5', iconClass)} />
        <span className="text-[10px] font-bold tracking-[0.14em] text-[var(--em-muted-ink)]">
          {KIND_LABEL[kind]}
        </span>
      </div>
      <h3 className="mt-1.5 text-sm font-bold">{title}</h3>
      {(timestamp || knowledgePoint) && (
        <p className="mt-0.5 text-[10px] leading-4 text-[var(--em-muted-ink)]">
          {[knowledgePoint, timestamp && `产生于 ${formatTime(timestamp)}`].filter(Boolean).join(' · ')}
        </p>
      )}
      <div className="mt-2.5">{children}</div>
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}

function ArtifactAction({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="rounded-full border border-violet-200 bg-violet-50/60 px-2.5 py-1 text-[11px] font-medium text-primary-700 hover:bg-violet-100">
        {children}
      </button>
    );
  }
  return (
    <span className="rounded-full border border-violet-100 bg-white/70 px-2.5 py-1 text-[11px] text-[var(--em-muted-ink)]">
      {children}
    </span>
  );
}

/**
 * 学习产物抽屉内容：集中展示当前学习产生的讲解、总结、练习、复述、来源与资源入口。
 * 范围切换只做展示层过滤，不做新的数据请求或业务推导。
 */
export function WorkspaceArtifactsPanel({
  scope,
  onScopeChange,
  task,
  knowledge,
  knowledgeLoading,
  knowledgeError,
  currentDiagnosis,
  isPrimaryFocus,
  sources,
  practiceEvaluation,
  reflection,
  evidenceLearningStarted,
  evidencePracticeEvaluated,
}: WorkspaceArtifactsPanelProps) {
  const withinTaskScope = scope !== 'session';
  const showPractice = practiceEvaluation !== null && (scope !== 'point' || practiceEvaluation.evidence.knowledgePointId === task.knowledgePointId);
  const showReflection = reflection !== null && (scope !== 'point' || reflection.knowledgePointId === task.knowledgePointId);

  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] text-primary-600">
        <Sparkles className="h-3.5 w-3.5" />
        ARTIFACTS
      </p>
      <div className="mt-3 flex gap-1.5" role="tablist" aria-label="产物范围">
        {SCOPES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={scope === item.id}
            onClick={() => onScopeChange(item.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition',
              scope === item.id
                ? 'border-primary-300 bg-violet-50 text-primary-800'
                : 'border-violet-100 bg-white/55 text-[var(--em-muted-ink)] hover:bg-violet-50/60',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {withinTaskScope && (
          <ArtifactCard
            kind="summary"
            title={knowledge?.title ?? task.knowledgePointName}
            knowledgePoint={task.knowledgePointName}
            tone="violet"
          >
            {knowledgeLoading && <p className="text-xs text-[var(--em-muted-ink)]">正在读取课程内容…</p>}
            {knowledgeError && <p className="text-xs text-amber-700">课程知识暂时没有加载成功，不使用静态内容替代。</p>}
            {!knowledgeLoading && !knowledgeError && !knowledge && (
              <p className="text-xs text-[var(--em-muted-ink)]">当前没有可展示的课程知识内容。</p>
            )}
            {knowledge && (
              <div className="space-y-2">
                {knowledge.sections.map((section) => (
                  <div key={section.title}>
                    <p className="text-xs font-semibold">{section.title}</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-[var(--em-muted-ink)]">{section.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ArtifactCard>
        )}

        {withinTaskScope && currentDiagnosis && (
          <ArtifactCard
            kind="feedback"
            title={currentDiagnosis.knowledgePointName}
            knowledgePoint={task.knowledgePointName}
            tone="sky"
          >
            <p className="text-xs leading-5 text-[var(--em-muted-ink)]">
              {DIAGNOSIS_STATUS_LABEL[currentDiagnosis.status]} · {currentDiagnosis.evidenceCount} 条评价证据
              {isPrimaryFocus && ' · 诊断主要关注'}
              {currentDiagnosis.status !== 'unassessed' && currentDiagnosis.status !== 'insufficient_evidence'
                ? ` · 掌握度 ${percent(currentDiagnosis.masteryScore)}`
                : '，暂不显示掌握度'}
            </p>
          </ArtifactCard>
        )}

        {showPractice && practiceEvaluation && (
          <ArtifactCard
            kind="practice"
            title={`${task.knowledgePointName} 练习`}
            timestamp={practiceEvaluation.evidence.occurredAt}
            knowledgePoint={task.knowledgePointName}
            tone="emerald"
          >
            <p className="text-sm font-semibold">
              掌握 {percent(practiceEvaluation.masteryBefore)} → {percent(practiceEvaluation.masteryAfter)}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--em-muted-ink)]">
              置信度 {percent(practiceEvaluation.confidence)} · {practiceEvaluation.evidenceCount} 条评价证据
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-[var(--em-muted-ink)]">{practiceEvaluation.message}</p>
            <p className="mt-1.5 text-[11px] font-medium text-emerald-700">
              {practiceEvaluation.replanning.status === 'performed'
                ? '当前计划已根据本次真实结果重新调整。'
                : practiceEvaluation.replanning.status === 'not_needed'
                  ? '结果已记录，当前计划无需调整。'
                  : '结果已记录，但计划调整未完成。'}
            </p>
          </ArtifactCard>
        )}

        {showReflection && reflection && (
          <ArtifactCard
            kind="reflection"
            title={reflection.knowledgePointName}
            timestamp={reflection.submittedAt}
            knowledgePoint={reflection.knowledgePointName}
            tone="fuchsia"
          >
            <p className="text-[11px] leading-5 text-[var(--em-muted-ink)]">
              已覆盖：{reflection.coveredConcepts.join('、') || '—'}；待补充：{reflection.missingConcepts.join('、') || '—'}
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-[var(--em-muted-ink)]">{reflection.nextSuggestion}</p>
            <div className="mt-2"><ArtifactAction>本地复述记录 · 刷新后清除</ArtifactAction></div>
          </ArtifactCard>
        )}

        {sources.length > 0 && (
          <ArtifactCard
            kind="sources"
            title={`本次回答引用了 ${sources.length} 个课程来源`}
            knowledgePoint={task.knowledgePointName}
            tone="sky"
          >
            <SourceReferences sources={sources} />
          </ArtifactCard>
        )}

        {scope === 'session' && (
          <ArtifactCard kind="resource" title="生成资源" knowledgePoint={task.knowledgePointName} tone="amber">
            <p className="flex items-start gap-1.5 text-[11px] leading-5 text-[var(--em-muted-ink)]">
              <WandSparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              学习资源在"学习工坊"按需生成，本工作台不会自动产生资源文件。
            </p>
            <div className="mt-2">
              <Link
                to="/resources"
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50/60 px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
              >
                打开学习工坊生成
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </ArtifactCard>
        )}

        {scope !== 'session' && (
          <p className="rounded-2xl border border-dashed border-violet-200 bg-white/40 px-4 py-3 text-[11px] leading-5 text-[var(--em-muted-ink)]">
            <BookOpen className="mr-1 inline h-3 w-3" />
            当前范围学习证据：开始学习 {evidenceLearningStarted} 条 · 练习评价 {evidencePracticeEvaluated} 条。
            <Lightbulb className="mx-1 inline h-3 w-3" />
            生成资源请在学习工坊按需创建。
            <Quote className="mx-1 inline h-3 w-3" />
            来源引用随本次回答产生。
          </p>
        )}

        {showPractice === false && practiceEvaluation === null && scope === 'point' && (
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--em-muted-ink)]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            当前知识点还没有本次会话产生的练习或复述产物。
          </p>
        )}
      </div>
    </div>
  );
}
