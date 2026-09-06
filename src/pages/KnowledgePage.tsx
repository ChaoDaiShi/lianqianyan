import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Info } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { KnowledgeGalaxy } from '@/components/knowledge/KnowledgeGalaxy';
import { fetchKnowledgeGraph, type KnowledgeGraphData } from '@/lib/educationApi';
import { useCurrentPlan, useDiagnosis, useLearnerProfile } from '@/lib/hooks';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';
import { PageIntro } from '@/components/design/PageIntro';

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
        <PageIntro eyebrow="KNOWLEDGE SPACE" title="课程 GraphRAG 知识空间" description={profile.data ? `${profile.data.courseName} · ${profile.data.knowledgePoints.length} 个真实知识点；自由拖拽浏览，点击节点查看详细知识。` : '正在读取当前课程的知识关系与学习状态。'} icon={BookOpen} tone="sky" aside={<p className="flex max-w-sm items-start gap-2 text-xs leading-5 text-[var(--em-muted-ink)]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />可拖拽平移与缩放；未评估不等于薄弱，关系只来自课程材料。</p>} />
        <KnowledgeGalaxy
          graph={graph}
          points={profile.data?.knowledgePoints ?? []}
          plan={plan.plan}
          courseId={ACTIVE_COURSE_ID}
          primaryFocusId={diagnosis.data?.primaryFocus?.knowledgePointId}
          loading={graphLoading || profile.loading || diagnosis.loading || plan.loading}
          error={graphError || profile.error || diagnosis.error || plan.error}
          onRetry={reload}
        />
      </div>
    </AppShell>
  );
}
