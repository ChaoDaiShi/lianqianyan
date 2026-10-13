import { X } from 'lucide-react';
import { ACTION_TYPE_LABEL, type KnowledgePointDiagnosis, type PersistedStudyTask } from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';
import { diagnosisReasons, getDiagnosisTone, isAssessedDiagnosis } from './diagnosisPresentation';

const EVIDENCE_TYPE_LABELS: Record<LearningEvidence['evidenceType'], string> = {
  learning_started: '开始学习',
  practice_answer_evaluated: '练习评价',
  exam_answer_evaluated: '考试评价',
};

const EVIDENCE_SOURCE_LABELS: Record<LearningEvidence['source'], string> = {
  current_study_plan: '当前学习计划',
  recommended_path: '推荐路径',
  learning_space: '学习空间',
  exam_system: '考试系统',
};

function resultDetails(evidence: LearningEvidence) {
  const rows: Array<{ label: string; value: string }> = [];
  const isCorrect = evidence.payload['is_correct'];
  const score = evidence.payload['score'];
  const scoreRatio = evidence.payload['score_ratio'];
  const feedback = evidence.payload['feedback'];

  if (typeof isCorrect === 'boolean') {
    rows.push({ label: '判定', value: isCorrect ? '正确' : '错误' });
  }
  if (typeof score === 'number') {
    rows.push({ label: '得分', value: String(score) });
  }
  if (typeof scoreRatio === 'number') {
    rows.push({ label: '得分率', value: `${Math.round(scoreRatio * 100)}%` });
  }
  if (typeof feedback === 'string' && feedback.trim()) {
    rows.push({ label: '评价说明', value: feedback });
  }
  return rows;
}

interface EvidenceDrawerProps {
  point: KnowledgePointDiagnosis;
  events: LearningEvidence[];
  loading: boolean;
  error: boolean;
  inCurrentPlan: boolean | null;
  planTask: PersistedStudyTask | null;
  planLoading: boolean;
  planError: boolean;
  onClose(): void;
}

export function EvidenceDrawer({
  point,
  events,
  loading,
  error,
  inCurrentPlan,
  planTask,
  planLoading,
  planError,
  onClose,
}: EvidenceDrawerProps) {
  const tone = getDiagnosisTone(point.status);
  const assessed = isAssessedDiagnosis(point.status);
  const matchingEvents = events
    .filter((item) => item.knowledgePointId === point.knowledgePointId)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="关闭证据抽屉"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/35"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-drawer-title"
        className="relative flex h-full w-full max-w-xl flex-col border-l border-[var(--em-border)] bg-[var(--em-surface)] shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--em-border)] p-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--em-primary)]">当前账号 · 当前课程</p>
            <h2 id="evidence-drawer-title" className="mt-1 text-lg font-semibold">
              {point.knowledgePointName}
            </h2>
            <p className="mt-1 text-sm text-[var(--em-muted-ink)]">
              <span className="font-medium">{tone.label}</span>
              {' · '}
              有效评价证据 {point.evidenceCount} 条
              {assessed ? ` · 掌握度 ${Math.round(point.masteryScore * 100)}%` : ' · 掌握度未知'}
            </p>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onClose} aria-label="关闭证据抽屉">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section aria-labelledby="evidence-reason-title">
            <h3 id="evidence-reason-title" className="text-sm font-semibold">诊断解释</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--em-ink)]">
              {diagnosisReasons(point).map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
            {!assessed && (
              <p className="mt-3 rounded-lg bg-[var(--em-surface-subtle)] p-3 text-sm leading-6 text-[var(--em-ink)]">
                当前状态是未知或证据不足；这里不把未知换算成 0% 掌握度。
              </p>
            )}
            <div className="mt-3 text-sm text-[var(--em-ink)]">
              {planLoading ? <p>正在读取当前学习计划…</p> : null}
              {!planLoading && planError ? <p>当前学习计划暂时无法读取。</p> : null}
              {!planLoading && !planError && (
                <p>当前学习计划：{inCurrentPlan ? '已包含该知识点' : '未包含该知识点'}</p>
              )}
              {!planLoading && !planError && planTask && (
                <p className="mt-2 rounded-lg bg-[var(--em-surface-subtle)] p-3 leading-6">
                  下一步：{ACTION_TYPE_LABEL[planTask.actionType]}「{planTask.knowledgePointName}」· 预计 {planTask.estimatedMinutes} 分钟
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby="evidence-history-title">
            <h3 id="evidence-history-title" className="text-sm font-semibold">近期学习证据</h3>
            {loading && <p className="mt-3 text-sm text-[var(--em-muted-ink)]">正在读取学习记录…</p>}
            {!loading && error && (
              <p role="status" className="mt-3 text-sm leading-6 text-amber-800">
                近期学习记录暂时无法读取；画像状态和记录明细分别来自各自的真实接口。
              </p>
            )}
            {!loading && !error && matchingEvents.length === 0 && (
              <p className="mt-3 rounded-lg border border-dashed border-[var(--em-border)] p-4 text-sm leading-6 text-[var(--em-muted-ink)]">
                当前返回的近期记录中没有该知识点的事件明细。画像中的证据计数仍显示在上方。
              </p>
            )}
            {!loading && !error && matchingEvents.length > 0 && (
              <ol className="mt-3 space-y-3">
                {matchingEvents.map((event) => {
                  const answer = event.payload['answer'];
                  const details = resultDetails(event);
                  return (
                  <li key={event.id} className="rounded-lg border border-[var(--em-border)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {EVIDENCE_TYPE_LABELS[event.evidenceType]}
                        </p>
                        <p className="mt-1 text-xs text-[var(--em-muted-ink)]">
                          来源：{EVIDENCE_SOURCE_LABELS[event.source]}
                          {event.questionId ? ` · 题目 ${event.questionId}` : ''}
                        </p>
                      </div>
                      <time dateTime={event.occurredAt} className="text-xs text-[var(--em-muted-ink)]">
                        {event.occurredAt}
                      </time>
                    </div>
                    {details.length > 0 && (
                      <dl className="mt-3 space-y-2 border-t border-[var(--em-border)] pt-3 text-sm">
                        {details.map((row) => (
                          <div key={row.label}>
                            <dt className="font-medium text-[var(--em-ink)]">{row.label}</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap leading-6 text-[var(--em-ink)]">{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {typeof answer === 'string' && answer.length > 0 && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--em-ink)]">
                        作答内容：{answer}
                      </p>
                    )}
                  </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
