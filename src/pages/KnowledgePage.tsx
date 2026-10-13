import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Info } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { KnowledgeDAG } from '@/components/knowledge/KnowledgeDAG';
import { fetchKnowledgeGraph, type KnowledgeGraphData } from '@/lib/educationApi';
import { useDiagnosis, useLearnerProfile } from '@/lib/hooks';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';
import { PageIntro } from '@/components/design/PageIntro';

export function KnowledgePage() {
  const profile = useLearnerProfile(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const diagnosis = useDiagnosis(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const [graph, setGraph] = useState<KnowledgeGraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState(false);

  const loadGraph = useCallback(async () => {
    setGraphLoading(true);
    setGraphError(false);
    try {
      setGraph(await fetchKnowledgeGraph(ACTIVE_COURSE_ID));
    } catch {
      setGraph(null);
      setGraphError(true);
    } finally {
      setGraphLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  const reload = () => {
    void loadGraph();
    void profile.refetch();
    void diagnosis.refetch();
  };

  const loading = graphLoading || profile.loading || diagnosis.loading;
  const error = graphError || profile.error || diagnosis.error;

  return (
    <AppShell>
      <div className="space-y-5">
        <PageIntro
          eyebrow="KNOWLEDGE SPACE"
          title="课程知识空间"
          description={profile.data
            ? `${profile.data.courseName} · ${profile.data.knowledgePoints.length} 个画像知识点。先修箭头来自课程知识库的明确声明。`
            : '正在读取当前课程的教材结构、知识状态与先修目录。'}
          icon={BookOpen}
          aside={(
            <p className="flex max-w-sm items-start gap-2 text-sm leading-6 text-[var(--em-muted-ink)]">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--em-primary)]" />
              未评估或没有先修状态时，知识点仍保持可查看，不会自动锁定。
            </p>
          )}
        />
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              {graphError ? '课程 GraphRAG 数据暂不可用。' : '学习状态暂不可用。'} 仍展示成功读取的真实数据。
            </p>
            <button type="button" onClick={reload} className="text-sm font-semibold text-amber-900 underline underline-offset-2">重新加载</button>
          </div>
        )}
        <KnowledgeDAG
          graph={graph}
          points={profile.data?.knowledgePoints ?? []}
          topics={[]}
          courseId={ACTIVE_COURSE_ID}
          primaryFocusId={diagnosis.data?.primaryFocus?.knowledgePointId}
        />
        {loading && <p className="text-sm text-[var(--em-muted-ink)]">正在读取课程知识数据…</p>}
      </div>
    </AppShell>
  );
}
