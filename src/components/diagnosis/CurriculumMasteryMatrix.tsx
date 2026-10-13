import { useMemo, useState } from 'react';
import type { DiagnosisStatus, KnowledgePointDiagnosis } from '@/domain';
import type { KnowledgeGraphData } from '@/lib/educationApi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  formatDiagnosisPercent,
  getDiagnosisTone,
  isAssessedDiagnosis,
} from './diagnosisPresentation';
import { buildCurriculumMatrix } from './curriculumMatrix';

const FILTERS: Array<{ value: DiagnosisStatus | 'all'; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'mastered', label: '掌握' },
  { value: 'proficient', label: '熟练' },
  { value: 'developing', label: '发展中' },
  { value: 'weak', label: '薄弱' },
  { value: 'unassessed', label: '尚未评估' },
  { value: 'insufficient_evidence', label: '证据不足' },
];

interface CurriculumMasteryMatrixProps {
  points: KnowledgePointDiagnosis[];
  graph: Pick<KnowledgeGraphData, 'nodes'> | null;
  selectedId: string | null;
  primaryFocusId: string | null;
  onSelect(point: KnowledgePointDiagnosis): void;
}

export function CurriculumMasteryMatrix({
  points,
  graph,
  selectedId,
  primaryFocusId,
  onSelect,
}: CurriculumMasteryMatrixProps) {
  const [filter, setFilter] = useState<DiagnosisStatus | 'all'>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const rows = useMemo(() => buildCurriculumMatrix(points, graph), [graph, points]);
  const pointById = useMemo(
    () => new Map(points.map((point) => [point.knowledgePointId, point])),
    [points],
  );
  const visibleRows = rows.filter((row) => filter === 'all' || row.status === filter);

  return (
    <section aria-label="课程知识能力矩阵" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="按诊断状态筛选">
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={filter === item.value ? 'default' : 'outline'}
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
            className="h-9 rounded-lg px-3"
          >
            {item.label}
          </Button>
        ))}
      </div>

      <ol className="space-y-3" aria-label="课程知识点目录">
        {visibleRows.map((row) => {
          const point = pointById.get(row.knowledgePointId)!;
          const tone = getDiagnosisTone(point.status);
          const assessed = isAssessedDiagnosis(point.status);
          const isCollapsed = collapsed.has(row.knowledgePointId);
          const primary = point.knowledgePointId === primaryFocusId;

          return (
            <li key={row.knowledgePointId}>
              <article
                className={cn(
                  'rounded-xl border bg-[var(--em-surface)] p-4',
                  selectedId === point.knowledgePointId
                    ? 'border-[var(--em-primary)] ring-1 ring-[var(--em-focus-ring)]'
                    : 'border-[var(--em-border)]',
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-pressed={selectedId === point.knowledgePointId}
                    onClick={() => onSelect(point)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-[var(--em-ink)]">
                        {row.title}
                      </span>
                      <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', tone.badge)}>
                        {tone.label}
                      </span>
                      {primary && (
                        <span className="rounded-md bg-[var(--em-surface-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--em-decision)]">
                          当前关注
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-[var(--em-muted-ink)]">
                      {point.knowledgePointId} · {point.evidenceCount} 条有效评价证据
                    </span>
                  </button>
                  {row.sections.length > 0 && (
                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      aria-label={`${row.title}教材小节`}
                      onClick={() =>
                        setCollapsed((current) => {
                          const next = new Set(current);
                          if (next.has(row.knowledgePointId)) next.delete(row.knowledgePointId);
                          else next.add(row.knowledgePointId);
                          return next;
                        })
                      }
                      className="shrink-0 rounded-lg border border-[var(--em-border)] px-3 py-2 text-xs font-medium text-[var(--em-ink)]"
                    >
                      {isCollapsed ? '展开目录' : '折叠目录'}
                    </button>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <span className={tone.text}>
                    掌握度 {formatDiagnosisPercent(point.masteryScore, assessed)}
                  </span>
                  {assessed ? (
                    <div
                      role="progressbar"
                      aria-label={`${row.title}掌握度`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(point.masteryScore * 100)}
                      className="h-2 w-36 overflow-hidden rounded-full bg-[var(--em-surface-subtle)]"
                    >
                      <div
                        className={cn('h-full rounded-full', tone.node)}
                        style={{ width: `${Math.round(point.masteryScore * 100)}%` }}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--em-muted-ink)]">未知状态不显示掌握度</span>
                  )}
                </div>

                {!isCollapsed && row.sections.length > 0 && (
                  <ul className="mt-3 border-l border-[var(--em-border)] pl-4" aria-label={`${row.title}教材目录`}>
                    {row.sections.map((section) => (
                      <li key={section} className="py-1.5 text-sm text-[var(--em-ink)]">
                        {section}
                        <span className="ml-2 text-xs text-[var(--em-muted-ink)]">尚无独立诊断状态</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </li>
          );
        })}
      </ol>

      {visibleRows.length === 0 && (
        <p className="rounded-lg border border-dashed border-[var(--em-border)] p-5 text-sm text-[var(--em-muted-ink)]">
          当前状态没有匹配的知识点。
        </p>
      )}
    </section>
  );
}
