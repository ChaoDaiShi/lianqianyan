import type { KnowledgePointDiagnosis, DiagnosisStatus } from '@/domain';
import type { KnowledgeGraphData } from '@/lib/educationApi';

export interface CurriculumMatrixRow {
  knowledgePointId: string;
  title: string;
  sections: string[];
  status: DiagnosisStatus;
}

export function buildCurriculumMatrix(
  points: KnowledgePointDiagnosis[],
  graph: Pick<KnowledgeGraphData, 'nodes'> | null,
): CurriculumMatrixRow[] {
  const order = new Map((graph?.nodes ?? []).filter((node) => node.kind === 'knowledge_point').map((node, index) => [node.knowledgePointId, node.order ?? index]));
  return [...points].sort((left, right) => (order.get(left.knowledgePointId) ?? 0) - (order.get(right.knowledgePointId) ?? 0)).map((point) => {
    const graphPoint = graph?.nodes.find(
      (node) =>
        node.kind === 'knowledge_point' &&
        node.knowledgePointId === point.knowledgePointId,
    );
    const sections = graph?.nodes
      .filter(
        (node) =>
          node.kind === 'section' &&
          node.knowledgePointId === point.knowledgePointId,
      )
      .map((node) => node.label) ?? [];

    return {
      knowledgePointId: point.knowledgePointId,
      title: graphPoint?.label ?? point.knowledgePointName,
      sections,
      status: point.status,
    };
  });
}
