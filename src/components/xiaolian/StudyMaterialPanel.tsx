import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { fetchKnowledgeGraph, type KnowledgeGraphData, type KnowledgePointContent } from '@/lib/educationApi';
import { MaterialProvenance } from '@/components/knowledge/MaterialProvenance';
import { useCurrentPlan, useKnowledgePoint } from '@/lib/hooks';
import { ACTIVE_COURSE_ID, ACTIVE_LEARNER_ID } from '@/store';
import { Button } from '@/components/ui/button';
import { MarkdownText } from '@/components/content/MarkdownText';

export function StudyMaterialPanel() {
  const plan = useCurrentPlan(ACTIVE_LEARNER_ID, ACTIVE_COURSE_ID);
  const tasks = useMemo(
    () => [...(plan.plan?.tasks ?? [])].sort((left, right) => left.order - right.order),
    [plan.plan],
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const task = tasks.find((item) => item.id === selectedTaskId) ?? tasks[0] ?? null;
  const material = useKnowledgePoint(task?.knowledgePointId, ACTIVE_COURSE_ID);
  const [graph, setGraph] = useState<KnowledgeGraphData | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const graphNode = graph?.nodes.find((item) => item.kind === 'knowledge_point' && item.knowledgePointId === task?.knowledgePointId);
  const prerequisites = (graph?.edges ?? []).filter((edge) => edge.relation === 'precedes' && edge.target === graphNode?.id).flatMap((edge) => {
    const node = graph?.nodes.find((item) => item.id === edge.source);
    return node ? [{ id: node.knowledgePointId ?? node.id, name: node.label }] : [];
  });

  useEffect(() => {
    let cancelled = false;
    fetchKnowledgeGraph(ACTIVE_COURSE_ID)
      .then((catalog) => { if (!cancelled) setGraph(catalog); })
      .catch(() => { if (!cancelled) setCatalogError(true); })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const data = material.data as KnowledgePointContent | null;

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--em-border)] bg-[var(--em-surface)] lg:min-h-[34rem]" aria-label="课程材料与关联知识">
      <header className="border-b border-[var(--em-border)] p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-[var(--em-primary)]"><BookOpen className="h-4 w-4" />课程材料</p>
        <h2 className="mt-1 text-lg font-semibold">先读当前任务对应的教材内容</h2>
        {plan.loading && <p className="mt-2 text-sm text-[var(--em-muted-ink)]">正在读取当前学习计划…</p>}
        {plan.error && <p role="status" className="mt-2 text-sm text-amber-800">当前学习计划暂时无法读取。</p>}
        {tasks.length > 0 && (
          <label className="mt-3 block text-sm font-medium text-[var(--em-ink)]">
            当前计划任务
            <select
              aria-label="当前计划知识点"
              value={task?.id ?? ''}
              onChange={(event) => setSelectedTaskId(event.target.value)}
              className="mt-1 block h-10 w-full rounded-lg border border-[var(--em-border)] bg-[var(--em-surface)] px-3 text-sm"
            >
              {tasks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.order}. {item.knowledgePointName}
                </option>
              ))}
            </select>
          </label>
        )}
        {task && (
          <p className="mt-2 text-xs text-[var(--em-muted-ink)]">
            当前任务：{task.knowledgePointName} · 预计 {task.estimatedMinutes} 分钟
          </p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {!plan.loading && !plan.error && !task && (
          <div className="rounded-lg border border-dashed border-[var(--em-border)] p-4">
            <p className="text-sm font-semibold">当前没有学习计划任务</p>
            <p className="mt-1 text-sm leading-6 text-[var(--em-muted-ink)]">
              这里会显示当前计划知识点接口返回的教材内容；现在没有选定任务，因此不填入示例材料。
            </p>
            <Button asChild variant="outline" className="mt-3">
              <a href="#/my-learning">查看我的学习</a>
            </Button>
          </div>
        )}
        {task && material.loading && <p className="text-sm text-[var(--em-muted-ink)]">正在读取当前课程教材…</p>}
        {task && material.error && <p role="status" className="text-sm text-amber-800">当前任务对应的教材暂时无法读取。</p>}
        {task && !material.loading && !material.error && data && (
          <div>
            <h3 className="text-lg font-semibold">{data.title}</h3>
            <p className="mt-1 text-xs text-[var(--em-muted-ink)]">课程 API 返回 {data.sections.length} 个教材小节</p>
            <div className="mt-3"><MaterialProvenance material={data} /></div>
            <div className="mt-5 space-y-6">
              {data.sections.map((section, index) => (
                <section key={`${section.title}-${index}`}>
                  <h4 className="mb-2 text-sm font-semibold">{section.title}</h4>
                  <MarkdownText content={section.content} />
                </section>
              ))}
            </div>
          </div>
        )}

        {task && (
          <details className="group mt-6 border-t border-[var(--em-border)] pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
              <span>关联前置知识</span>
              <ChevronDown className="h-4 w-4 text-[var(--em-muted-ink)] transition group-open:rotate-180" />
            </summary>
            {catalogLoading && <p className="mt-3 text-sm text-[var(--em-muted-ink)]">正在读取课程前置目录…</p>}
            {!catalogLoading && catalogError && <p className="mt-3 text-sm text-[var(--em-muted-ink)]">课程前置目录暂不可用。</p>}
            {!catalogLoading && !catalogError && prerequisites.length ? (
              <ul className="mt-3 space-y-2">
                {prerequisites.map((prerequisite) => (
                  <li key={prerequisite.id} className="rounded-lg border border-[var(--em-border)] bg-[var(--em-surface-subtle)] p-3">
                    <p className="text-sm font-medium text-[var(--em-ink)]">{prerequisite.name}</p>
                    <p className="mt-1 text-xs text-[var(--em-muted-ink)]">目录知识点 ID：{prerequisite.id}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            {!catalogLoading && !catalogError && prerequisites.length === 0 && (
              <p className="mt-3 text-sm text-[var(--em-muted-ink)]">课程目录没有为此任务返回前置知识点。</p>
            )}

          </details>
        )}
      </div>
    </section>
  );
}
