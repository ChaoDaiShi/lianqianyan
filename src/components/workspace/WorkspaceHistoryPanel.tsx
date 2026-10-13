import { useState } from 'react';
import { BookOpenCheck, ClipboardCheck, Loader2, MessageSquareText, RotateCw, ScrollText } from 'lucide-react';
import type { PersistedStudyTask } from '@/domain';
import { ACTION_TYPE_LABEL } from '@/domain';
import type { LearningEvidence, PracticeEvaluationResponse } from '@/lib/educationApi';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import { Button } from '@/components/ui/button';

export interface WorkspaceHistoryPanelProps {
  tasks: PersistedStudyTask[];
  evidence: LearningEvidence[];
  practiceEvaluations: Record<string, PracticeEvaluationResponse>;
  reflectionResults: Record<string, ReflectionResult>;
  loading: boolean;
  error: boolean;
  onRetry(): void;
}

type HistorySection = 'chat' | 'learning' | 'practice' | 'reflection' | 'tasks';

const SECTIONS: Array<{ id: HistorySection; label: string; icon: typeof MessageSquareText }> = [
  { id: 'chat', label: '对话', icon: MessageSquareText },
  { id: 'learning', label: '学习行为', icon: BookOpenCheck },
  { id: 'practice', label: '练习', icon: ClipboardCheck },
  { id: 'reflection', label: '复述', icon: ScrollText },
  { id: 'tasks', label: '任务', icon: Loader2 },
];

const EVIDENCE_LABEL: Record<LearningEvidence['evidenceType'], string> = {
  learning_started: '开始学习',
  practice_answer_evaluated: '完成练习评价',
  exam_answer_evaluated: '考试判卷记录',
};

const SOURCE_LABEL: Record<LearningEvidence['source'], string> = {
  current_study_plan: '当前学习计划',
  recommended_path: '推荐路径',
  learning_space: '学习空间',
  exam_system: '考试系统',
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN');
  } catch {
    return iso;
  }
}

function percent(value: unknown): string | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${Math.round(value * 100)}%`
    : null;
}

function EvidenceEventItem({ item, taskNames }: { item: LearningEvidence; taskNames: Map<string, string> }) {
  const pointName = taskNames.get(item.knowledgePointId ?? '') ?? item.knowledgePointId ?? '未知知识点';
  const masteryDelta = percent(item.masteryDelta);
  return (
    <li>
      <details className="rounded-xl border border-violet-100 bg-[var(--em-surface)]/55 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold text-[var(--em-ink)]">
          {EVIDENCE_LABEL[item.evidenceType]} · {pointName}
        </summary>
        <dl className="mt-2 space-y-1 text-[11px] leading-5 text-[var(--em-muted-ink)]">
          <div className="flex gap-2"><dt className="shrink-0">时间</dt><dd>{formatTime(item.occurredAt)}</dd></div>
          <div className="flex gap-2"><dt className="shrink-0">来源</dt><dd>{SOURCE_LABEL[item.source]}</dd></div>
          {item.sessionId && <div className="flex gap-2"><dt className="shrink-0">会话</dt><dd className="break-all">{item.sessionId}</dd></div>}
          {masteryDelta && <div className="flex gap-2"><dt className="shrink-0">掌握变化</dt><dd>{masteryDelta}</dd></div>}
        </dl>
      </details>
    </li>
  );
}

function EvidenceList({ items, emptyText, taskNames }: { items: LearningEvidence[]; emptyText: string; taskNames: Map<string, string> }) {
  if (items.length === 0) {
    return <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">{emptyText}</p>;
  }
  const sorted = [...items].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return (
    <ul className="mt-2 space-y-2">
      {sorted.map((item) => <EvidenceEventItem key={item.id} item={item} taskNames={taskNames} />)}
    </ul>
  );
}

/**
 * 历史记录抽屉内容：对话/学习行为/练习/复述/任务五类分区。
 * 只负责呈现；数据由页面从既有 hook/store 编排传入。
 */
export function WorkspaceHistoryPanel({
  tasks,
  evidence,
  practiceEvaluations,
  reflectionResults,
  loading,
  error,
  onRetry,
}: WorkspaceHistoryPanelProps) {
  const [section, setSection] = useState<HistorySection>('learning');
  const taskNames = new Map(tasks.map((task) => [task.knowledgePointId, task.knowledgePointName]));
  const currentSection = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0];
  const CurrentIcon = currentSection.icon;
  const practiceEntries = Object.entries(practiceEvaluations);
  const reflectionEntries = Object.entries(reflectionResults);

  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] text-[var(--em-primary)]">
        <CurrentIcon className="h-3.5 w-3.5" />
        HISTORY
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="历史分类">
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          const active = item.id === section;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSection(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                active
                  ? 'border-[var(--em-primary)] bg-violet-50 text-[var(--em-primary-deep)]'
                  : 'border-violet-100 bg-[var(--em-surface)]/55 text-[var(--em-muted-ink)] hover:bg-violet-50/60'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {section === 'chat' && (
          <section aria-label="对话记录">
            <p className="rounded-2xl border border-dashed border-violet-200 bg-[var(--em-surface)]/45 px-4 py-3 text-xs leading-5 text-[var(--em-muted-ink)]">
              当前版本尚未提供可恢复的云端对话历史；对话内容仅保留在当前页面会话中，刷新后即清空。
            </p>
          </section>
        )}

        {section === 'learning' && (
          <section aria-label="学习行为记录">
            {loading && <p className="flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><Loader2 className="h-3.5 w-3.5 animate-spin" />正在读取学习证据…</p>}
            {error && !loading && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs text-amber-700">暂时无法读取学习证据。</p>
                <Button type="button" variant="outline" size="sm" onClick={onRetry} className="gap-2 rounded-xl">
                  <RotateCw className="h-3.5 w-3.5" />重新读取
                </Button>
              </div>
            )}
            {!loading && !error && (
              <>
                <EvidenceList
                  items={evidence.filter((item) => item.evidenceType === 'learning_started')}
                  emptyText="还没有开始学习的记录。"
                  taskNames={taskNames}
                />
                <p className="mt-3 text-[10px] leading-4 text-[var(--em-muted-ink)]">
                  记录来自服务端 LearningEvidence，覆盖当前账号与课程。
                </p>
              </>
            )}
          </section>
        )}

        {section === 'practice' && (
          <section aria-label="练习记录">
            {practiceEntries.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-[var(--em-primary-deep)]">本次会话 · 服务端评价结果</p>
                <ul className="mt-2 space-y-2">
                  {practiceEntries.map(([taskId, evaluation]) => {
                    const pointName = taskNames.get(evaluation.evidence.knowledgePointId ?? '') ?? evaluation.evidence.knowledgePointId ?? '练习';
                    return (
                      <li key={taskId}>
                        <details className="rounded-xl border border-sky-100 bg-[var(--em-surface)]/55 px-3 py-2">
                          <summary className="cursor-pointer text-xs font-semibold text-[var(--em-ink)]">
                            练习评价 · {pointName}
                          </summary>
                          <dl className="mt-2 space-y-1 text-[11px] leading-5 text-[var(--em-muted-ink)]">
                            <div className="flex gap-2"><dt className="shrink-0">时间</dt><dd>{formatTime(evaluation.evidence.occurredAt)}</dd></div>
                            <div className="flex gap-2"><dt className="shrink-0">掌握变化</dt><dd>{percent(evaluation.masteryBefore)} → {percent(evaluation.masteryAfter)}</dd></div>
                            <div className="flex gap-2"><dt className="shrink-0">置信度</dt><dd>{percent(evaluation.confidence)}</dd></div>
                            <div className="flex gap-2"><dt className="shrink-0">计划调整</dt><dd>{evaluation.replanning.status === 'performed' ? '已重新规划' : evaluation.replanning.status === 'not_needed' ? '无需调整' : '调整未成功'}</dd></div>
                            <div className="flex gap-2"><dt className="shrink-0">结论</dt><dd>{evaluation.message}</dd></div>
                          </dl>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <p className={`text-[10px] font-semibold text-[var(--em-primary-deep)] ${practiceEntries.length > 0 ? 'mt-4' : ''}`}>云端学习证据</p>
            {loading && <p className="mt-2 flex items-center gap-2 text-xs text-[var(--em-muted-ink)]"><Loader2 className="h-3.5 w-3.5 animate-spin" />正在读取…</p>}
            {!loading && !error && (
              <EvidenceList
                items={evidence.filter((item) => item.evidenceType === 'practice_answer_evaluated')}
                emptyText="还没有练习评价记录。"
                taskNames={taskNames}
              />
            )}
          </section>
        )}

        {section === 'reflection' && (
          <section aria-label="复述记录">
            {reflectionEntries.length === 0 ? (
              <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">本次会话还没有提交复述。</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {reflectionEntries.map(([taskId, result]) => (
                  <li key={taskId}>
                    <details className="rounded-xl border border-fuchsia-100 bg-[var(--em-surface)]/55 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-semibold text-[var(--em-ink)]">
                        复述 · {result.knowledgePointName}
                      </summary>
                      <dl className="mt-2 space-y-1 text-[11px] leading-5 text-[var(--em-muted-ink)]">
                        <div className="flex gap-2"><dt className="shrink-0">时间</dt><dd>{formatTime(result.submittedAt)}</dd></div>
                        <div className="flex gap-2"><dt className="shrink-0">已覆盖</dt><dd>{result.coveredConcepts.join('、') || '—'}</dd></div>
                        <div className="flex gap-2"><dt className="shrink-0">建议</dt><dd>{result.nextSuggestion}</dd></div>
                      </dl>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-[10px] leading-4 text-amber-800">
              以上为本地复述记录，只保存在当前浏览器会话，刷新后即清空；不代表云端长期记忆。
            </p>
          </section>
        )}

        {section === 'tasks' && (
          <section aria-label="学习任务历史">
            {tasks.length === 0 ? (
              <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">当前计划没有任务记录。</p>
            ) : (
              <ol className="mt-2 space-y-2">
                {[...tasks].sort((left, right) => left.order - right.order).map((task) => (
                  <li key={task.id} className="rounded-xl border border-violet-100 bg-[var(--em-surface)]/55 px-3 py-2">
                    <p className="text-xs font-semibold text-[var(--em-ink)]">
                      第 {task.order} 项 · {task.knowledgePointName}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--em-muted-ink)]">
                      {ACTION_TYPE_LABEL[task.actionType]} · 预计 {task.estimatedMinutes} 分钟
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-3 text-[10px] leading-4 text-[var(--em-muted-ink)]">
              任务来自当前生效的 Current Plan；重新规划会替换这份列表。
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
