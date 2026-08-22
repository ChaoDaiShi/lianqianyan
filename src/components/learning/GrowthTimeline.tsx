import { BookOpen, CheckCircle2, PlayCircle, XCircle } from 'lucide-react';
import type { LearningEvidence } from '@/lib/educationApi';
import { GlassPanel } from '@/components/design/GlassPanel';

interface GrowthTimelineProps {
  evidence: LearningEvidence[];
  knowledgeNames?: Record<string, string>;
  learnerId: string;
  courseId: string;
  limit?: number;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

function numberFrom(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((today - target) / 86400000);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function GrowthTimeline({ evidence, knowledgeNames = {}, learnerId, courseId, limit, loading = false, error = false, onRetry }: GrowthTimelineProps) {
  const items = evidence
    .filter((item) => item.learnerId === learnerId && item.courseId === courseId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);

  return (
    <GlassPanel className="p-5 sm:p-6">
      <p className="text-[10px] font-bold tracking-[0.18em] text-primary-600">GROWTH TIMELINE</p>
      <h2 className="mt-1 text-xl font-bold">真实成长轨迹</h2>
      {loading && <p className="mt-5 text-sm text-[var(--em-muted-ink)]">正在读取学习证据…</p>}
      {!loading && error && <div className="mt-5"><p className="text-sm text-amber-700">最近学习证据暂时无法读取。</p>{onRetry && <button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold text-primary-700">重新加载</button>}</div>}
      {!loading && !error && items.length === 0 && <p className="mt-5 rounded-[18px] border border-dashed border-violet-200 bg-white/40 p-5 text-sm text-[var(--em-muted-ink)]">还没有真实学习证据。开始一项任务或完成练习后，这里会记录你的成长。</p>}
      {!loading && !error && items.length > 0 && <ol className="mt-5 space-y-4">{items.map((item, index) => {
        const before = numberFrom(item.payload, 'mastery_before');
        const after = numberFrom(item.payload, 'mastery_after');
        const isCorrect = item.payload['is_correct'];
        const name = item.knowledgePointId ? knowledgeNames[item.knowledgePointId] ?? item.knowledgePointId : '当前学习内容';
        const practice = item.evidenceType === 'practice_answer_evaluated';
        return <li key={item.id} className="relative flex gap-3"><div className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-violet-100 bg-white text-primary-600">{practice ? isCorrect === true ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : isCorrect === false ? <XCircle className="h-4 w-4 text-rose-400" /> : <BookOpen className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}</div>{index < items.length - 1 && <span className="absolute bottom-[-1rem] left-[17px] top-9 w-px bg-violet-100" />}<div className="min-w-0 flex-1 rounded-[18px] border border-violet-100 bg-white/50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{practice ? `完成「${name}」练习` : `开始学习「${name}」`}</strong><time className="text-[11px] text-[var(--em-muted-ink)]">{dayLabel(item.occurredAt)} · {timeLabel(item.occurredAt)}</time></div>{practice && before != null && after != null && <p className="mt-2 text-sm text-[var(--em-muted-ink)]">掌握度 <span className="font-semibold text-[var(--em-ink)]">{Math.round(before * 100)}%</span> <span className="mx-1 text-primary-400">→</span> <span className="font-bold text-primary-700">{Math.round(after * 100)}%</span></p>}{practice && (before == null || after == null) && <p className="mt-2 text-xs text-[var(--em-muted-ink)]">这条证据没有携带历史掌握度快照，因此不推测变化。</p>}</div></li>;
      })}</ol>}
      <p className="mt-4 text-[11px] text-[var(--em-muted-ink)]">练习前后掌握度仅显示服务端写入 Evidence payload 的真实快照。</p>
    </GlassPanel>
  );
}
