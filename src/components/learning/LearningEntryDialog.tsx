import {
  AlertTriangle,
  BookOpenCheck,
  Clock3,
  History,
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  DIAGNOSIS_REASON_TEXT,
  DIAGNOSIS_STATUS_LABEL,
  type DiagnosisResult,
  type PersistedStudyPlan,
  type PersistedStudyTask,
} from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
import { buildLearningEntryContent } from './companionFlow';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface LearningEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PersistedStudyPlan | null;
  task: PersistedStudyTask | null;
  diagnosis: DiagnosisResult | null;
  evidence: LearningEvidence[];
  dataLoading?: boolean;
  diagnosisError?: boolean;
  evidenceError?: boolean;
  starting?: boolean;
  startError?: string | null;
  onConfirm: () => void;
}

function formatEvidence(item: LearningEvidence): string {
  const action =
    item.evidenceType === 'practice_answer_evaluated'
      ? '完成过练习评价'
      : '开始过学习';
  const date = new Date(item.occurredAt);
  const time = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
  return time ? `${action} · ${time}` : action;
}

export function LearningEntryDialog({
  open,
  onOpenChange,
  plan,
  task,
  diagnosis,
  evidence,
  dataLoading = false,
  diagnosisError = false,
  evidenceError = false,
  starting = false,
  startError = null,
  onConfirm,
}: LearningEntryDialogProps) {
  const content =
    plan && task
      ? buildLearningEntryContent({ plan, task, diagnosis, evidence })
      : null;
  const diagnosisReason = content?.diagnosisFocus?.reasonCodes
    .map((code) => DIAGNOSIS_REASON_TEXT[code])
    .filter(Boolean)
    .join(' ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-violet-100 bg-[var(--em-canvas)] sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-700">
            <Sparkles className="h-4 w-4" />
            小涟学习准备
          </div>
          <DialogTitle className="pt-1 text-2xl">开始前，我们先看清这一程</DialogTitle>
          <DialogDescription>
            内容来自当前诊断、计划任务和已有学习记录，不会生成新的历史记忆。
          </DialogDescription>
        </DialogHeader>

        {!content ? (
          <p className="rounded-lg border border-dashed border-violet-200 p-4 text-sm text-[var(--em-muted-ink)]">
            当前没有可准备的真实计划任务。
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="rounded-lg border border-violet-100 bg-white/70 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-primary-700">
                <BookOpenCheck className="h-4 w-4" />
                当前知识点
              </p>
              <strong className="mt-2 block text-lg">
                {content.knowledgePointName}
              </strong>
            </section>

            <section className="rounded-lg border border-sky-100 bg-white/70 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-sky-700">
                <Target className="h-4 w-4" />
                今天学习目标
              </p>
              <p className="mt-2 text-sm leading-6">{content.todayGoal}</p>
            </section>

            <section className="rounded-lg border border-amber-100 bg-white/70 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                当前诊断重点
              </p>
              {dataLoading ? (
                <p className="mt-2 text-sm text-[var(--em-muted-ink)]">
                  正在读取诊断…
                </p>
              ) : diagnosisError && !diagnosis ? (
                <p className="mt-2 text-sm text-amber-800">
                  当前诊断暂时无法加载，不使用推测内容补齐。
                </p>
              ) : content.diagnosisFocus ? (
                <>
                  <p className="mt-2 text-sm font-semibold">
                    {content.diagnosisFocus.knowledgePointName} ·{' '}
                    {DIAGNOSIS_STATUS_LABEL[content.diagnosisFocus.status]}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">
                    {content.diagnosisFocus.evidenceCount} 条评价证据
                    {diagnosisReason ? ` · ${diagnosisReason}` : ''}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">
                  当前诊断没有将这个知识点列为重点关注项。
                </p>
              )}
            </section>

            <section className="rounded-lg border border-emerald-100 bg-white/70 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <History className="h-4 w-4" />
                历史学习提醒
              </p>
              {dataLoading ? (
                <p className="mt-2 text-sm text-[var(--em-muted-ink)]">
                  正在读取学习记录…
                </p>
              ) : evidenceError && evidence.length === 0 ? (
                <p className="mt-2 text-sm text-amber-800">
                  学习记录暂时无法加载，不使用虚构记录补齐。
                </p>
              ) : content.historicalEvidence.length > 0 ? (
                <ul className="mt-2 space-y-1.5 text-sm text-[var(--em-muted-ink)]">
                  {content.historicalEvidence.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{formatEvidence(item)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[var(--em-muted-ink)]">
                  当前没有这个知识点的可展示学习记录。
                </p>
              )}
            </section>
          </div>
        )}

        {startError ? (
          <p className="text-sm text-amber-700">{startError}</p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={starting}
          >
            稍后再学
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={!content || dataLoading || starting}
            className="gap-2 bg-primary-500 hover:bg-primary-600"
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {starting ? '正在进入学习…' : '准备好了，开始学习'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
