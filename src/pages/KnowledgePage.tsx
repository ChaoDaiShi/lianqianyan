import { BookOpen, Info } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/design/GlassPanel';
import { KnowledgeGalaxy } from '@/components/knowledge/KnowledgeGalaxy';
import { useDiagnosis, useLearnerProfile } from '@/lib/hooks';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';

const LEGEND = [
  ['MASTERED', '掌握'],
  ['PROFICIENT', '熟练'],
  ['DEVELOPING', '发展中'],
  ['WEAK', '薄弱'],
  ['UNASSESSED', '尚未评估 / 证据不足'],
];

export function KnowledgePage() {
  const profile = useLearnerProfile(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const diagnosis = useDiagnosis(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const reload = () => { void profile.refetch(); void diagnosis.refetch(); };

  return (
    <AppShell>
      <div className="space-y-6">
        <GlassPanel className="p-6 sm:p-8">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-primary-700"><BookOpen className="h-4 w-4" />KNOWLEDGE GALAXY</p>
          <h1 className="mt-3 text-3xl font-bold">知识星海</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--em-muted-ink)]">{profile.data ? `${profile.data.courseName} · ${profile.data.knowledgePoints.length} 个真实知识点` : '正在读取当前课程的知识点状态。'}</p>
          <div className="mt-4 flex flex-wrap gap-2">{LEGEND.map(([key, label]) => <span key={key} className="rounded-full border border-violet-100 bg-white/60 px-3 py-1 text-[10px] text-[var(--em-muted-ink)]"><strong className="text-primary-700">{key}</strong> · {label}</span>)}</div>
          <div className="mt-4 flex items-start gap-2 rounded-[16px] border border-sky-100 bg-sky-50/55 p-4"><Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" /><p className="text-xs leading-5 text-sky-800">这是学习画像中知识点状态的星海视图，不推断知识点关系，也不把未评估或证据不足解释为薄弱。</p></div>
        </GlassPanel>
        <KnowledgeGalaxy points={profile.data?.knowledgePoints ?? []} primaryFocusId={diagnosis.data?.primaryFocus?.knowledgePointId} loading={profile.loading} error={profile.error} onRetry={reload} />
      </div>
    </AppShell>
  );
}
