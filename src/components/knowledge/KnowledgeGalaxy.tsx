import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import type { KnowledgePointDiagnosis } from '@/domain';
import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDiagnosisPercent, getDiagnosisTone, isAssessedDiagnosis } from '@/components/diagnosis/diagnosisPresentation';

interface KnowledgeGalaxyProps {
  points: KnowledgePointDiagnosis[];
  primaryFocusId?: string | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

const STATUS_GROUP = {
  mastered: 'MASTERED',
  proficient: 'PROFICIENT',
  developing: 'DEVELOPING',
  weak: 'WEAK',
  unassessed: 'UNASSESSED',
  insufficient_evidence: 'UNASSESSED',
} as const;

export function KnowledgeGalaxy({ points, primaryFocusId, loading, error, onRetry }: KnowledgeGalaxyProps) {
  if (loading) return <div className="rounded-[28px] border border-violet-100 bg-white/55 p-8 text-sm text-[var(--em-muted-ink)]"><p className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />正在读取知识点状态…</p></div>;
  if (error) return <div className="rounded-[28px] border border-amber-100 bg-amber-50/55 p-8 text-center"><p className="text-sm text-amber-800">知识点状态暂时没有加载成功。</p><Button variant="outline" size="sm" onClick={onRetry} className="mt-3 gap-2 rounded-xl"><RefreshCw className="h-3.5 w-3.5" />重新加载</Button></div>;
  if (points.length === 0) return <div className="rounded-[28px] border border-dashed border-violet-200 bg-white/45 p-8 text-center text-sm text-[var(--em-muted-ink)]">当前学习画像没有返回知识点。</div>;

  return (
    <div>
      <div className="relative grid gap-4 overflow-hidden rounded-[30px] border border-violet-100 bg-[radial-gradient(circle_at_20%_20%,rgba(167,139,250,.18),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,.13),transparent_32%),rgba(255,255,255,.48)] p-5 sm:grid-cols-2 sm:p-7 xl:grid-cols-3">
        <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <span key={index} className="absolute h-1 w-1 rounded-full bg-primary-300" style={{ left: `${8 + ((index * 29) % 86)}%`, top: `${7 + ((index * 41) % 82)}%` }} />)}</div>
        {points.map((point) => {
          const assessed = isAssessedDiagnosis(point.status);
          const tone = getDiagnosisTone(point.status);
          const isFocus = point.knowledgePointId === primaryFocusId;
          return <article key={point.knowledgePointId} className={cn('relative rounded-[24px] border bg-white/70 p-5 backdrop-blur-sm', isFocus ? 'border-fuchsia-300 shadow-[0_16px_40px_rgba(217,70,239,.12)]' : 'border-white/80')}>
            <div className="flex items-start justify-between gap-3"><span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-full shadow-lg', tone.node, tone.glow)}><Sparkles className="h-5 w-5 text-white" /></span><div className="flex flex-wrap justify-end gap-1"><span className={cn('rounded-full px-2 py-1 text-[9px] font-bold', tone.badge)}>{STATUS_GROUP[point.status]}</span>{isFocus && <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-[9px] font-bold text-fuchsia-700">当前关注</span>}</div></div>
            <h3 className="mt-4 text-sm font-bold">{point.knowledgePointName}</h3>
            <p className="mt-1 text-xs text-[var(--em-muted-ink)]">{DIAGNOSIS_STATUS_LABEL[point.status]}</p>
            <p className="mt-3 text-xs leading-5 text-[var(--em-muted-ink)]">{assessed ? `掌握度 ${formatDiagnosisPercent(point.masteryScore, true)} · ${point.evidenceCount} 条评价证据` : point.status === 'insufficient_evidence' ? `${point.evidenceCount} 条评价证据，当前证据不足` : '尚未评估，不代表薄弱'}</p>
          </article>;
        })}
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--em-muted-ink)]">每颗星只代表一个真实知识点及其当前诊断状态；节点之间不表达关系、路径或先修依赖。</p>
    </div>
  );
}
