import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Info } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { KnowledgeGalaxy } from '@/components/knowledge/KnowledgeGalaxy';
import { fetchKnowledgeGraph, type KnowledgeGraphData } from '@/lib/educationApi';
import { useCurrentPlan, useDiagnosis, useLearnerProfile } from '@/lib/hooks';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';

export function KnowledgePage() {
  const profile = useLearnerProfile(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const diagnosis = useDiagnosis(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const plan = useCurrentPlan(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const [graph, setGraph] = useState<KnowledgeGraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState(false);

  const loadGraph = useCallback(async () => {
    setGraphLoading(true);
    setGraphError(false);
    try {
      setGraph(await fetchKnowledgeGraph(ACTIVE_COURSE_ID));
    } catch {
      setGraphError(true);
    } finally {
      setGraphLoading(false);
    }
  }, []);

  useEffect(() => { void loadGraph(); }, [loadGraph]);

  const reload = () => {
    void loadGraph();
    void profile.refetch();
    void diagnosis.refetch();
    void plan.refetch();
  };

  return (
    <AppShell scene="galaxy">
      <div className="space-y-5">
        <header className="px-1 sm:px-2">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-primary-700"><BookOpen className="h-4 w-4" />KNOWLEDGE SPACE</p>
          <div className="mt-2 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-[-0.035em] sm:text-4xl">把课程关系与学习状态，看成同一片星海</h1>
              <p className="mt-3 text-sm leading-7 text-[var(--em-muted-ink)]">{profile.data ? `${profile.data.courseName} · ${profile.data.knowledgePoints.length} 个真实知识点` : '正在读取当前课程的知识关系与学习状态。'}</p>
            </div>
            <p className="flex max-w-xl items-start gap-2 text-xs leading-5 text-[var(--em-muted-ink)]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />未评估不等于薄弱；节点大小只表达当前选择与计划优先级，不虚构新的知识关系。</p>
          </div>
        </header>
        <KnowledgeGalaxy
          graph={graph}
          points={profile.data?.knowledgePoints ?? []}
          plan={plan.plan}
          primaryFocusId={diagnosis.data?.primaryFocus?.knowledgePointId}
          loading={graphLoading || profile.loading || diagnosis.loading || plan.loading}
          error={graphError || profile.error || diagnosis.error || plan.error}
          onRetry={reload}
        />
      </div>
    </AppShell>
  );
}
