import { describe, expect, it } from 'vitest';
import type { KnowledgePointDiagnosis, PersistedStudyPlan } from '@/domain';
import type { KnowledgeGraphData } from '@/lib/educationApi';
import {
  buildKnowledgeScene,
  getKnowledgeNodeStatusText,
} from './knowledgePresentation';

const points: KnowledgePointDiagnosis[] = [
  {
    knowledgePointId: 'kp-deadlock',
    knowledgePointName: '死锁',
    masteryScore: 0.32,
    confidence: 0.8,
    evidenceCount: 3,
    status: 'weak',
    priorityScore: 1,
    reasonCodes: ['LOW_MASTERY'],
  },
  {
    knowledgePointId: 'kp-process',
    knowledgePointName: '进程基础',
    masteryScore: 0,
    confidence: 0,
    evidenceCount: 0,
    status: 'unassessed',
    priorityScore: 0,
    reasonCodes: ['NO_EVIDENCE'],
  },
];

const graph: KnowledgeGraphData = {
  courseId: 'course-os',
  generationMode: 'course_grounded',
  nodes: [
    { id: 'course:course-os', label: '操作系统', kind: 'course', knowledgePointId: null, sourceSections: ['课程大纲'] },
    { id: 'point:kp-deadlock', label: '死锁', kind: 'knowledge_point', knowledgePointId: 'kp-deadlock', sourceSections: ['死锁 · 定义'] },
    { id: 'point:kp-process', label: '进程基础', kind: 'knowledge_point', knowledgePointId: 'kp-process', sourceSections: ['进程 · 基础'] },
  ],
  edges: [
    { id: 'edge-1', source: 'course:course-os', target: 'point:kp-deadlock', relation: 'contains', sourceSections: ['课程大纲'] },
  ],
  sources: ['课程大纲', '死锁 · 定义'],
};

const plan: PersistedStudyPlan = {
  id: 'plan-1',
  learnerId: 'learner-1',
  courseId: 'course-os',
  status: 'active',
  strategy: 'diagnosis_driven',
  generatedAt: '2026-08-28T08:00:00.000Z',
  sourceDiagnosisGeneratedAt: '2026-08-28T07:00:00.000Z',
  reasonCodes: ['PRIMARY_FOCUS'],
  createdAt: '2026-08-28T08:00:00.000Z',
  updatedAt: '2026-08-28T08:00:00.000Z',
  tasks: [{
    id: 'task-1', planId: 'plan-1', draftKey: 'draft-1',
    knowledgePointId: 'kp-deadlock', knowledgePointName: '死锁',
    actionType: 'remediate', priority: 1, estimatedMinutes: 20,
    reasonCodes: ['PRIMARY_FOCUS'], sourceStatus: 'weak',
    sourcePriorityScore: 1, order: 1,
    createdAt: '2026-08-28T08:00:00.000Z',
  }],
};

describe('knowledge presentation', () => {
  it('joins real graph nodes with diagnosis and the current plan', () => {
    const scene = buildKnowledgeScene({ graph, points, plan });

    expect(scene.nodes.find((node) => node.id === 'point:kp-deadlock')).toMatchObject({
      status: 'weak',
      inCurrentPlan: true,
    });
    expect(scene.edges).toEqual(graph.edges);
  });

  it('does not print a mastery percentage for unassessed evidence', () => {
    expect(getKnowledgeNodeStatusText(points[1])).toBe('尚未评估，不代表薄弱');
    expect(getKnowledgeNodeStatusText(points[0])).toContain('32%');
  });
});
