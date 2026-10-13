import type { KnowledgePointDiagnosis } from '@/domain';
import type { LeapTopic } from '@/lib/adaptiveApi';
import type { KnowledgeGraphData } from '@/lib/educationApi';

export interface PrerequisiteDagNode {
  id: string;
  label: string;
  status: KnowledgePointDiagnosis['status'] | null;
  column: number;
  row: number;
  external: boolean;
}

export interface PrerequisiteDagEdge {
  source: string;
  target: string;
}

export interface PrerequisiteDag {
  nodes: PrerequisiteDagNode[];
  edges: PrerequisiteDagEdge[];
}

export function buildPrerequisiteDag(
  points: KnowledgePointDiagnosis[],
  topics: Pick<LeapTopic, 'knowledgePointId' | 'prerequisites'>[],
  graph?: KnowledgeGraphData | null,
): PrerequisiteDag {
  if (graph) {
    const order = new Map(graph.nodes.filter((node) => node.kind === 'knowledge_point').map((node, index) => [node.knowledgePointId, node.order ?? index]));
    points = [...points].sort((left, right) => (order.get(left.knowledgePointId) ?? 0) - (order.get(right.knowledgePointId) ?? 0));
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    topics = graph.edges.filter((edge) => edge.relation === 'precedes').flatMap((edge) => {
      const source = nodes.get(edge.source);
      const target = nodes.get(edge.target);
      return source?.kind === 'knowledge_point' && target?.kind === 'knowledge_point'
        && source.knowledgePointId && target.knowledgePointId
        ? [{ knowledgePointId: target.knowledgePointId, prerequisites: [{ id: source.knowledgePointId, name: source.label }] }]
        : [];
    });
  }
  const pointById = new Map(
    points.map((point) => [point.knowledgePointId, point]),
  );
  const nodeLabels = new Map(
    points.map((point) => [point.knowledgePointId, point.knowledgePointName]),
  );
  const externalIds = new Set<string>();
  const edgeKeys = new Set<string>();
  const edges: PrerequisiteDagEdge[] = [];

  topics.forEach((topic) => {
    if (!pointById.has(topic.knowledgePointId)) return;
    topic.prerequisites.forEach((prerequisite) => {
      nodeLabels.set(
        prerequisite.id,
        pointById.get(prerequisite.id)?.knowledgePointName ?? prerequisite.name,
      );
      if (!pointById.has(prerequisite.id)) externalIds.add(prerequisite.id);
      const key = `${prerequisite.id}->${topic.knowledgePointId}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push({ source: prerequisite.id, target: topic.knowledgePointId });
    });
  });

  const nodeIds = [...nodeLabels.keys()];
  const incoming = new Map(nodeIds.map((id) => [id, 0]));
  const outgoing = new Map(nodeIds.map((id) => [id, [] as string[]]));
  edges.forEach((edge) => {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  });

  const available = nodeIds.filter((id) => incoming.get(id) === 0);
  const columns = new Map(nodeIds.map((id) => [id, 0]));
  const ordered: string[] = [];
  while (available.length > 0) {
    const id = available.shift()!;
    ordered.push(id);
    outgoing.get(id)?.forEach((target) => {
      columns.set(
        target,
        Math.max(columns.get(target) ?? 0, (columns.get(id) ?? 0) + 1),
      );
      incoming.set(target, (incoming.get(target) ?? 0) - 1);
      if (incoming.get(target) === 0) available.push(target);
    });
  }

  const rowByColumn = new Map<number, number>();
  const nodes = ordered.map((id) => {
    const column = columns.get(id) ?? 0;
    const row = rowByColumn.get(column) ?? 0;
    rowByColumn.set(column, row + 1);
    const point = pointById.get(id);
    return {
      id,
      label: nodeLabels.get(id) ?? id,
      status: point?.status ?? null,
      column,
      row,
      external: externalIds.has(id),
    };
  });

  return { nodes, edges };
}
