import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  DiagnosisResult,
  PersistedStudyPlan,
  PersistedStudyTask,
} from '@/domain';
import type { LearningEvidence } from '@/lib/educationApi';
import { buildEvidenceOrbit, EvidenceOrbit } from './EvidenceOrbit';

const diagnosis: DiagnosisResult = {
  learnerId: 'learner-1',
  courseId: 'course-os',
  courseName: '操作系统',
  primaryFocus: null,
  priorityInterventions: [],
  strengths: [],
  weakPoints: [],
  developingPoints: [],
  unassessedPoints: [],
  summaryCodes: [],
  diagnosisGeneratedAt: '2026-10-05T08:00:00.000Z',
};

const task: PersistedStudyTask = {
  id: 'task-1',
  planId: 'plan-1',
  draftKey: 'draft-1',
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  actionType: 'remediate',
  priority: 1,
  estimatedMinutes: 20,
  reasonCodes: ['PRIMARY_FOCUS'],
  sourceStatus: 'weak',
  sourcePriorityScore: 1,
  order: 1,
  createdAt: '2026-10-05T08:10:00.000Z',
};

const plan: PersistedStudyPlan = {
  id: 'plan-1',
  learnerId: 'learner-1',
  courseId: 'course-os',
  status: 'active',
  strategy: 'diagnosis_driven',
  generatedAt: '2026-10-05T08:10:00.000Z',
  sourceDiagnosisGeneratedAt: diagnosis.diagnosisGeneratedAt,
  reasonCodes: ['PRIMARY_FOCUS'],
  createdAt: '2026-10-05T08:10:00.000Z',
  updatedAt: '2026-10-05T08:10:00.000Z',
  tasks: [task],
};

function evidence(
  type: LearningEvidence['evidenceType'],
): LearningEvidence {
  return {
    id: `evidence-${type}`,
    learnerId: 'learner-1',
    courseId: 'course-os',
    knowledgePointId: task.knowledgePointId,
    evidenceType: type,
    source: type === 'learning_started' ? 'current_study_plan' : 'learning_space',
    payload: {},
    occurredAt: '2026-10-05T09:00:00.000Z',
  };
}

describe('buildEvidenceOrbit', () => {
  it('keeps the first diagnosis node current when no data exists', () => {
    const model = buildEvidenceOrbit({
      diagnosis: null,
      plan: null,
      task: null,
      evidence: [],
    });

    expect(model.nodes.map((node) => node.state)).toEqual([
      'current',
      'waiting',
      'waiting',
      'waiting',
    ]);
    expect(model.focusTitle).toBe('等待首次诊断');
    expect(model.progress).toBe(0);
  });

  it('derives a complete orbit only from matching learning and practice evidence', () => {
    const model = buildEvidenceOrbit({
      diagnosis,
      plan,
      task,
      evidence: [
        evidence('learning_started'),
        {
          ...evidence('practice_answer_evaluated'),
          payload: { independent: true, hintUsed: false },
        },
      ],
    });

    expect(model.nodes.every((node) => node.state === 'completed')).toBe(true);
    expect(model.focusTitle).toBe('死锁');
    expect(model.evidenceCount).toBe(2);
    expect(model.taskCount).toBe(1);
    expect(model.progress).toBe(1);
    expect(model.currentLabel).toBe('闭环完成');
  });

  it('keeps ordinary practice out of the independent validation stage', () => {
    const model = buildEvidenceOrbit({
      diagnosis,
      plan,
      task,
      evidence: [
        evidence('learning_started'),
        {
          ...evidence('practice_answer_evaluated'),
          payload: { score: 0.8, hintUsed: false },
        },
      ],
    });

    expect(model.nodes[2].state).toBe('completed');
    expect(model.nodes[3].state).toBe('current');
    expect(model.currentLabel).toBe('独立验证');
  });
});

describe('EvidenceOrbit', () => {
  it('renders an accessible SVG with explicit node states', () => {
    const html = renderToStaticMarkup(
      <EvidenceOrbit
        model={buildEvidenceOrbit({
          diagnosis,
          plan,
          task,
          evidence: [evidence('learning_started')],
        })}
      />,
    );

    expect(html).toContain('<svg');
    expect(html).toContain('data-evidence-orbit="true"');
    expect(html).toContain('学习四阶段进度');
    expect(html.match(/data-orbit-node=/g)).toHaveLength(4);
    expect(html).toContain('data-orbit-state="current"');
    expect(html).toContain('死锁');
  });
});
