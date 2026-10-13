import { useEffect, useState } from 'react';
import type { KnowledgePointDiagnosis, PersistedStudyPlan } from '@/domain';
import type { KnowledgeGraphData } from '@/lib/educationApi';
import { fetchLeapCatalog, type LeapTopic } from '@/lib/adaptiveApi';
import { KnowledgeDAG } from './KnowledgeDAG';

interface KnowledgeGalaxyProps {
  graph: KnowledgeGraphData | null;
  points: KnowledgePointDiagnosis[];
  plan: PersistedStudyPlan | null;
  courseId: string;
  primaryFocusId?: string | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

/** Compatibility export; the rendered view is the curriculum DAG workbench. */
export function KnowledgeGalaxy({
  graph,
  points,
  courseId,
  primaryFocusId,
  loading,
  error,
  onRetry,
}: KnowledgeGalaxyProps) {
  const [topics, setTopics] = useState<LeapTopic[]>([]);
  const [catalogError, setCatalogError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLeapCatalog()
      .then((catalog) => { if (!cancelled) setTopics(catalog.topics); })
      .catch(() => { if (!cancelled) setCatalogError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      {(error || catalogError) && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span>{catalogError ? 'LEAP 前置目录暂不可用；不展示推断出来的依赖。' : '课程知识数据暂不可用。'}</span>
          <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">重新加载</button>
        </div>
      )}
      {loading && !graph && <p className="text-sm text-[var(--em-muted-ink)]">正在读取课程知识图谱…</p>}
      <KnowledgeDAG
        graph={graph}
        points={points}
        topics={topics}
        courseId={courseId}
        primaryFocusId={primaryFocusId}
      />
    </div>
  );
}
