import { Loader2, RotateCw } from 'lucide-react';
import type { AgentChatResponse, LearningEvidence } from '@/lib/educationApi';
import type { KnowledgePointDiagnosis, PersistedStudyTask } from '@/domain';
import { ACTION_TYPE_LABEL, DIAGNOSIS_STATUS_LABEL } from '@/domain';
import { Button } from '@/components/ui/button';
import { AgentToolTrace } from '@/components/learning/AgentToolTrace';
import { filterLearningEvidence } from '@/components/learning/learningLoop';

export interface WorkspaceContextPanelProps {
  courseName: string;
  task: PersistedStudyTask;
  planTaskCount: number;
  currentDiagnosis: KnowledgePointDiagnosis | null;
  diagnosisLoading: boolean;
  learnerId: string;
  courseId: string;
  evidence: LearningEvidence[];
  evidenceLoading: boolean;
  evidenceError: boolean;
  onRetryEvidence(): void;
  response: AgentChatResponse | null;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN');
  } catch {
    return iso;
  }
}

const EVIDENCE_LABEL: Record<LearningEvidence['evidenceType'], string> = {
  learning_started: '开始学习',
  practice_answer_evaluated: '完成练习评价',
  exam_answer_evaluated: '考试判卷记录',
};

/**
 * 学习上下文抽屉内容：小涟当前依据（课程/任务/计划位置/诊断）、
 * 评价证据面板与默认折叠的技术详情（Agent/Tool/Provider/语音）。
 * 只负责呈现；数据由页面编排传入，不在组件内重新请求或推导。
 */
export function WorkspaceContextPanel({
  courseName,
  task,
  planTaskCount,
  currentDiagnosis,
  diagnosisLoading,
  learnerId,
  courseId,
  evidence,
  evidenceLoading,
  evidenceError,
  onRetryEvidence,
  response,
}: WorkspaceContextPanelProps) {
  const scoped = filterLearningEvidence({
    evidence,
    learnerId,
    courseId,
    knowledgePointId: task.knowledgePointId,
  });
  const recent = [...scoped.learningStarted, ...scoped.practiceEvaluated]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 5);

  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.16em] text-primary-600">LEARNING CONTEXT</p>
      <dl className="mt-3 space-y-2 text-xs">
        {[
          ['当前课程', courseName],
          ['当前知识点', task.knowledgePointName],
          ['当前任务', `${ACTION_TYPE_LABEL[task.actionType]} · 预计 ${task.estimatedMinutes} 分钟`],
          ['计划位置', `第 ${task.order} / ${planTaskCount} 项`],
          [
            '诊断状态',
            diagnosisLoading
              ? '正在读取诊断…'
              : currentDiagnosis
                ? DIAGNOSIS_STATUS_LABEL[currentDiagnosis.status]
                : '诊断未返回此知识点状态',
          ],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 rounded-xl border border-violet-100 bg-white/55 px-3 py-2">
            <dt className="shrink-0 text-[var(--em-muted-ink)]">{label}</dt>
            <dd className="text-right font-semibold text-[var(--em-ink)]">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[10px] leading-4 text-[var(--em-muted-ink)]">
        完整学习画像与历史趋势见"学习档案"页；此处只呈现当前任务的即时依据。
      </p>

      <section aria-label="评价证据" className="mt-5 border-t border-violet-100 pt-4">
        <p className="text-xs font-bold">评价证据 · {scoped.learningStarted.length + scoped.practiceEvaluated.length} 条</p>
        {evidenceLoading && (
          <p className="mt-2 flex items-center gap-2 text-xs text-[var(--em-muted-ink)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />正在读取学习证据…
          </p>
        )}
        {evidenceError && !evidenceLoading && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-xs text-amber-700">暂时无法读取学习证据。</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetryEvidence} className="gap-2 rounded-xl">
              <RotateCw className="h-3.5 w-3.5" />重新读取
            </Button>
          </div>
        )}
        {!evidenceLoading && !evidenceError && (
          recent.length === 0 ? (
            <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
              当前知识点还没有可展示的学习证据。
            </p>
          ) : (
            <>
              <p className="mt-2 text-[10px] font-semibold text-primary-700">最近证据</p>
              <ul className="mt-1.5 space-y-1.5">
                {recent.map((item) => (
                  <li key={item.id} className="text-[11px] leading-5 text-[var(--em-muted-ink)]">
                    {EVIDENCE_LABEL[item.evidenceType]} · {formatTime(item.occurredAt)}
                  </li>
                ))}
              </ul>
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] font-semibold text-primary-700">查看全部证据</summary>
                <ul className="mt-1.5 space-y-1.5">
                  {[...scoped.learningStarted, ...scoped.practiceEvaluated]
                    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
                    .map((item) => (
                      <li key={item.id} className="text-[11px] leading-5 text-[var(--em-muted-ink)]">
                        {EVIDENCE_LABEL[item.evidenceType]} · {formatTime(item.occurredAt)}
                      </li>
                    ))}
                </ul>
              </details>
            </>
          )
        )}
      </section>

      {response && (
        <details className="mt-5 border-t border-violet-100 pt-4" data-runtime-details="true">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--em-muted-ink)]">技术详情（Agent · Tool · Provider）</summary>
          <div className="mt-3 space-y-3">
            <AgentToolTrace items={response.agentTrace} sources={response.sources} compact />
            <p className="text-[10px] leading-5 text-[var(--em-muted-ink)]">
              Provider：{response.provider}{response.model ? ` · ${response.model}` : ' · 基础辅导'}
            </p>
            {response.contextUsed.length > 0 && (
              <p className="text-[10px] leading-5 text-[var(--em-muted-ink)]">
                回答使用上下文：{response.contextUsed.join('、')}
              </p>
            )}
          </div>
        </details>
      )}

    </div>
  );
}
