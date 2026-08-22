import type { KnowledgePointDiagnosis } from '@/domain';
import { cn } from '@/lib/utils';
import { formatDiagnosisPercent, getDiagnosisTone, isAssessedDiagnosis } from './diagnosisPresentation';

export function KnowledgeStarMap({ points, primaryFocusId }: { points: KnowledgePointDiagnosis[]; primaryFocusId?: string | null }) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2 text-[11px] text-[var(--em-muted-ink)]">
        {(['unassessed', 'weak', 'developing', 'proficient', 'mastered'] as const).map((status) => { const tone = getDiagnosisTone(status); return <span key={status} className="inline-flex items-center gap-1.5 rounded-full bg-white/55 px-2.5 py-1"><span className={cn('h-2 w-2 rounded-full', tone.node)} />{tone.label}</span>; })}
      </div>
      <ol className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="pointer-events-none absolute left-10 right-10 top-1/2 hidden h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent lg:block" aria-hidden="true" />
        {points.map((point, index) => { const assessed = isAssessedDiagnosis(point.status); const tone = getDiagnosisTone(point.status); const primary = point.knowledgePointId === primaryFocusId; return (
          <li key={point.knowledgePointId} className="relative">
            <article aria-label={`${point.knowledgePointName}，${tone.label}，${point.evidenceCount} 条证据${assessed ? `，掌握度 ${formatDiagnosisPercent(point.masteryScore, true)}，可信度 ${formatDiagnosisPercent(point.confidence, true)}` : ''}`} className={cn('relative flex gap-4 overflow-hidden rounded-[20px] border bg-white/60 p-4 md:min-h-36 md:flex-col md:justify-between', primary ? 'border-fuchsia-200 shadow-[0_16px_40px_rgba(217,70,239,0.14)]' : 'border-violet-100')}>
              <div className={cn('relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-lg', tone.node, tone.glow)}>{String(index + 1).padStart(2, '0')}</div>
              <div className="relative z-10 min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[var(--em-ink)]">{point.knowledgePointName}</h3>{primary && <span className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700">优先关注</span>}</div><p className="mt-1 text-xs text-[var(--em-muted-ink)]">{tone.label} · {point.evidenceCount} 条有效评价证据</p><div className="mt-3 flex flex-wrap gap-3 text-xs"><span className={tone.text}>掌握度 {formatDiagnosisPercent(point.masteryScore, assessed)}</span><span className="text-[var(--em-muted-ink)]">可信度 {formatDiagnosisPercent(point.confidence, assessed)}</span></div></div>
            </article>
          </li>
        ); })}
      </ol>
    </div>
  );
}
