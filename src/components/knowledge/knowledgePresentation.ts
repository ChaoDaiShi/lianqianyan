import type {
  DiagnosisStatus,
  KnowledgePointDiagnosis,
  PersistedStudyPlan,
} from '@/domain';
import type {
  KnowledgeGraphData,
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
} from '@/lib/educationApi';
import { formatDiagnosisPercent, isAssessedDiagnosis } from '@/components/diagnosis/diagnosisPresentation';

export interface KnowledgeSceneNode extends KnowledgeGraphNode {
  status: DiagnosisStatus | null;
  diagnosis: KnowledgePointDiagnosis | null;
  inCurrentPlan: boolean;
}

export interface KnowledgeScene {
  nodes: KnowledgeSceneNode[];
  edges: KnowledgeGraphEdge[];
}

export function buildKnowledgeScene({
  graph,
  points,
  plan,
}: {
  graph: KnowledgeGraphData;
  points: KnowledgePointDiagnosis[];
  plan: PersistedStudyPlan | null;
}): KnowledgeScene {
  const diagnosisById = new Map(
    points.map((point) => [point.knowledgePointId, point]),
  );
  const plannedIds = new Set(
    plan?.status === 'active'
      ? plan.tasks.map((task) => task.knowledgePointId)
      : [],
  );

  return {
    nodes: graph.nodes.map((node) => {
      const diagnosis = node.knowledgePointId
        ? diagnosisById.get(node.knowledgePointId) ?? null
        : null;
      return {
        ...node,
        diagnosis,
        status: diagnosis?.status ?? null,
        inCurrentPlan: node.knowledgePointId
          ? plannedIds.has(node.knowledgePointId)
          : false,
      };
    }),
    edges: graph.edges,
  };
}

export function getKnowledgeNodeStatusText(
  point: KnowledgePointDiagnosis,
): string {
  if (!isAssessedDiagnosis(point.status)) {
    return point.status === 'insufficient_evidence'
      ? `${point.evidenceCount} 条评价证据，当前证据不足`
      : '尚未评估，不代表薄弱';
  }
  return `掌握度 ${formatDiagnosisPercent(point.masteryScore, true)} · ${point.evidenceCount} 条评价证据`;
}
