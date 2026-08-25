import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import type { KnowledgePerformanceRow } from './profileVisualization';

export function KnowledgePerformanceBars({
  rows,
}: {
  rows: KnowledgePerformanceRow[];
}) {
  return (
    <section className="rounded-[22px] border border-violet-100 bg-white/55 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">知识点掌握与考试表现</h3>
          <p className="mt-1 text-xs text-[var(--em-muted-ink)]">
            画像掌握度与已评分考试按知识点对照
          </p>
        </div>
        <div className="flex gap-3 text-[10px] font-semibold text-[var(--em-muted-ink)]">
          <span className="before:mr-1 before:inline-block before:h-2 before:w-2 before:rounded-full before:bg-violet-500">画像</span>
          <span className="before:mr-1 before:inline-block before:h-2 before:w-2 before:rounded-full before:bg-sky-400">考试</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-violet-50/70 p-4 text-sm text-[var(--em-muted-ink)]">
          暂无可展示的知识点。
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {rows.map((row) => (
            <li key={row.knowledgePointId}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <strong className="truncate text-sm">{row.knowledgePointName}</strong>
                <span className="shrink-0 text-[var(--em-muted-ink)]">
                  {DIAGNOSIS_STATUS_LABEL[row.status]} · {row.evidenceCount} 条画像证据
                </span>
              </div>
              <div className="mt-2 grid grid-cols-[44px_1fr_44px] items-center gap-2 text-[10px]">
                <span className="text-[var(--em-muted-ink)]">画像</span>
                <div className="h-2 overflow-hidden rounded-full bg-violet-100">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${row.mastery}%` }} />
                </div>
                <strong className="text-right">{row.mastery}%</strong>
                <span className="text-[var(--em-muted-ink)]">考试</span>
                {row.examScore === null ? (
                  <div className="col-span-2 text-xs text-[var(--em-muted-ink)]">暂无考试样本</div>
                ) : (
                  <>
                    <div className="h-2 overflow-hidden rounded-full bg-sky-100">
                      <div className="h-full rounded-full bg-sky-400" style={{ width: `${row.examScore}%` }} />
                    </div>
                    <strong className="text-right" title={`${row.examAnsweredCount} 道已评分题`}>
                      {row.examScore}%
                    </strong>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
