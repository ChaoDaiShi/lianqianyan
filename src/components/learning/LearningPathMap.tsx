import type { KnowledgePointDiagnosis, PersistedStudyTask } from '@/domain';
import { DIAGNOSIS_STATUS_LABEL } from '@/domain';
import { cn } from '@/lib/utils';
import { formatDiagnosisPercent, isAssessedDiagnosis } from '@/components/diagnosis/diagnosisPresentation';
import { GlassPanel } from '@/components/design/GlassPanel';

interface LearningPathMapProps {
  points: KnowledgePointDiagnosis[];
  currentKnowledgePointId: string;
  planTasks: PersistedStudyTask[];
  primaryFocusId?: string | null;
}

export function LearningPathMap({ points, currentKnowledgePointId, planTasks, primaryFocusId }: LearningPathMapProps) {
  const pointById = new Map(points.map((point) => [point.knowledgePointId, point]));
  const tasks = [...planTasks].sort((a, b) => a.order - b.order);
  return <GlassPanel className="overflow-hidden p-5 sm:p-6">
    <p className="text-[10px] font-bold tracking-[0.18em] text-primary-600">CURRENT PLAN PATH</p>
    <h2 className="mt-1 text-xl font-bold">当前学习路径</h2>
    <p className="mt-1 text-xs leading-5 text-[var(--em-muted-ink)]">节点和箭头只表示 Current Plan 中的真实任务顺序，不表达知识点先修关系。</p>
    {tasks.length === 0 ? <p className="mt-5 rounded-[18px] border border-dashed border-violet-200 bg-white/40 p-5 text-sm text-[var(--em-muted-ink)]">当前计划没有任务，因此不展示模拟学习路径。</p> : <ol className="mt-5 flex max-w-full gap-3 overflow-x-auto pb-3" aria-label="当前计划任务顺序">
      {tasks.map((task, index) => {
        const point = pointById.get(task.knowledgePointId);
        const current = task.knowledgePointId === currentKnowledgePointId;
        const assessed = point ? isAssessedDiagnosis(point.status) : false;
        return <li key={task.id} className="relative min-w-[11rem] flex-1"><div aria-current={current ? 'step' : undefined} className={cn('h-full rounded-[18px] border p-4', current ? 'border-primary-400 bg-primary-50 shadow-[0_12px_30px_rgba(139,124,246,.18)]' : 'border-sky-200 bg-sky-50/55')}><div className="flex items-center justify-between gap-2"><span className={cn('grid h-7 w-7 place-items-center rounded-xl text-xs font-bold', current ? 'bg-primary-500 text-white' : 'bg-sky-100 text-sky-700')}>{task.order}</span>{task.knowledgePointId === primaryFocusId && <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[9px] font-semibold text-pink-700">诊断关注</span>}</div><strong className="mt-3 block text-sm">{task.knowledgePointName}</strong><p className="mt-1 text-[11px] text-[var(--em-muted-ink)]">{point ? DIAGNOSIS_STATUS_LABEL[point.status] : '尚无诊断状态'}{point && assessed ? ` · ${formatDiagnosisPercent(point.masteryScore, true)}` : ''}</p><p className="mt-2 text-[10px] text-[var(--em-muted-ink)]">预计 {task.estimatedMinutes} 分钟</p></div>{index < tasks.length - 1 && <span className="absolute -right-2 top-1/2 z-10 -translate-y-1/2 text-primary-400" aria-hidden="true">→</span>}</li>;
      })}
    </ol>}
    <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[var(--em-muted-ink)]"><span>紫色：当前任务</span><span>蓝色：计划内后续任务</span><span>序号：服务端任务 order</span><span>未知状态不显示掌握度</span></div>
  </GlassPanel>;
}
