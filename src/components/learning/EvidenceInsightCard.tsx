import { BookOpenCheck, ClipboardCheck, RotateCw, ScrollText } from 'lucide-react';
import { GlassPanel } from '@/components/design/GlassPanel';
import { filterLearningEvidence } from '@/components/learning/learningLoop';
import { Button } from '@/components/ui/button';
import type { LearningEvidence } from '@/lib/educationApi';

export interface EvidenceInsightCardProps {
  evidence: LearningEvidence[];
  learnerId: string;
  courseId: string;
  knowledgePointId: string;
  loading: boolean;
  error: boolean;
  onRetry?: () => void;
}

function EvidenceEvents({
  items,
  emptyText,
}: {
  items: LearningEvidence[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item) => (
        <li
          key={item.id}
          className="text-xs leading-5 text-[var(--em-muted-ink)]"
        >
          <time dateTime={item.occurredAt}>
            {new Date(item.occurredAt).toLocaleString('zh-CN')}
          </time>
        </li>
      ))}
    </ul>
  );
}

export function EvidenceInsightCard({
  evidence,
  learnerId,
  courseId,
  knowledgePointId,
  loading,
  error,
  onRetry,
}: EvidenceInsightCardProps) {
  const filtered = filterLearningEvidence({
    evidence,
    learnerId,
    courseId,
    knowledgePointId,
  });

  return (
    <GlassPanel className="p-5 sm:p-6">
      <h2 className="text-lg font-bold">小涟如何了解你的学习情况</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">
        以下内容只读取当前学习证据，不会在此处修改记录。
      </p>

      {loading ? (
        <p className="mt-5 text-sm text-[var(--em-muted-ink)]">
          正在读取学习证据
        </p>
      ) : error ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <p className="text-sm text-amber-700">暂时无法读取学习证据。</p>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-2"
            >
              <RotateCw className="h-4 w-4" />
              重新读取
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <section className="rounded-lg border border-violet-100 bg-white/45 p-4">
            <BookOpenCheck className="h-4 w-4 text-primary-600" />
            <h3 className="mt-2 text-sm font-semibold">学习行为</h3>
            <EvidenceEvents
              items={filtered.learningStarted}
              emptyText="当前知识点没有 learning_started 记录。"
            />
          </section>
          <section className="rounded-lg border border-sky-100 bg-white/45 p-4">
            <ClipboardCheck className="h-4 w-4 text-sky-600" />
            <h3 className="mt-2 text-sm font-semibold">练习结果</h3>
            <EvidenceEvents
              items={filtered.practiceEvaluated}
              emptyText="当前知识点没有 practice_answer_evaluated 记录。"
            />
          </section>
          <section className="rounded-lg border border-slate-200 bg-white/45 p-4">
            <ScrollText className="h-4 w-4 text-slate-500" />
            <h3 className="mt-2 text-sm font-semibold">复述记录</h3>
            <p className="mt-2 text-xs leading-5 text-[var(--em-muted-ink)]">
              当前 Evidence 合同未返回复述记录。
            </p>
          </section>
        </div>
      )}
    </GlassPanel>
  );
}
