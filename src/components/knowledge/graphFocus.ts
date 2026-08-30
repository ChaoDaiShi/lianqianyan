import type { KnowledgeGraphEdge } from '@/lib/educationApi';
import type {
  KnowledgeScene,
  KnowledgeSceneNode,
} from './knowledgePresentation';

export interface KnowledgeGraphFocus {
  selected: KnowledgeSceneNode | null;
  activeKnowledgePointId: string | null;
  nodes: KnowledgeSceneNode[];
  edges: KnowledgeGraphEdge[];
}

export function buildGraphFocus(
  scene: KnowledgeScene,
  selectedId: string | null
): KnowledgeGraphFocus {
  const selected =
    scene.nodes.find(node => node.id === selectedId) ??
    scene.nodes.find(node => node.kind === 'knowledge_point') ??
    scene.nodes[0] ??
    null;
  const activeKnowledgePointId = selected?.knowledgePointId ?? null;
  const nodes = scene.nodes.filter(
    node =>
      node.kind !== 'section' ||
      node.knowledgePointId === activeKnowledgePointId
  );
  const visibleIds = new Set(nodes.map(node => node.id));
  const edges = scene.edges.filter(
    edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)
  );

  return { selected, activeKnowledgePointId, nodes, edges };
}
