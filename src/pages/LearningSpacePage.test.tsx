// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/xiaolian/XiaolianCharacter', () => ({ XiaolianCharacter: () => <span>小涟角色</span> }));
vi.mock('@/components/learning/LearningEntryDialog', () => ({ LearningEntryDialog: () => null }));
vi.mock('@/components/learning/useStartPlanTask', () => ({ useStartPlanTask: () => ({ startTask: vi.fn(), startingTaskId: null, error: null }) }));
vi.mock('@/components/learning/ModulePractice', () => ({ ModulePractice: ({ knowledgePointId }: { knowledgePointId: string }) => <div data-testid="module-practice" data-knowledge-point-id={knowledgePointId}>练习区</div> }));
vi.mock('@/components/learning/SpaceTutor', () => ({ SpaceTutor: () => <div>小涟即时答疑</div> }));
vi.mock('@/components/workspace/WorkspaceArtifactsPanel', () => ({ WorkspaceArtifactsPanel: () => <div>学习产物内容</div> }));
vi.mock('@/components/workspace/WorkspaceHistoryPanel', () => ({ WorkspaceHistoryPanel: () => <div>历史记录内容</div> }));
vi.mock('@/components/workspace/WorkspaceContextPanel', () => ({ WorkspaceContextPanel: () => <div>学习上下文内容</div> }));
vi.mock('@/components/learning/SourceReferences', () => ({ SourceReferences: () => <div>课程来源内容</div> }));
vi.mock('@/components/adaptive/LeapEntryCard', () => ({ LeapEntryCard: () => null }));
vi.mock('@/components/feedback/LearningState', () => ({ LearningState: () => <div>学习状态</div> }));
vi.mock('@/components/xiaolian/XiaolianFeedbackBubble', () => ({ XiaolianFeedbackBubble: () => null }));
vi.mock('@/store', () => {
  const runtime = { setRuntimeState: vi.fn(), setCompanionState: vi.fn(), runtimeState: 'idle', companionState: 'companion', reset: vi.fn() };
  const loop = { reflectionResults: {}, practiceEvaluations: {}, tutorResponses: {}, learningSessionIds: {}, setPracticeEvaluation: vi.fn(), setTutorResponse: vi.fn() };
  const workspace = { taskId: null, knowledgePointId: null };
  return {
    ACTIVE_COURSE_ID: 'course-ds',
    ACTIVE_LEARNER_ID: 'learner-1',
    useXiaolianRuntimeStore: (selector: (state: typeof runtime) => unknown) => selector(runtime),
    useLearningLoopStore: (selector: (state: typeof loop) => unknown) => selector(loop),
    useWorkspaceStore: (selector: (state: typeof workspace) => unknown) => selector(workspace),
  };
});
vi.mock('@/lib/hooks', () => {
  const task = { id: 'task-1', planId: 'plan-1', draftKey: 'array-basics', knowledgePointId: 'kp-array', knowledgePointName: '数组基础', actionType: 'strengthen', priority: 1, estimatedMinutes: 20, reasonCodes: ['NEEDS_STRENGTHENING'], sourceStatus: 'developing', sourcePriorityScore: 0.7, order: 1, createdAt: '2026-10-13T08:00:00Z' };
  return {
    useCurrentPlan: () => ({ plan: { id: 'plan-1', learnerId: 'learner-1', courseId: 'course-ds', status: 'active', strategy: 'diagnosis_driven', generatedAt: '2026-10-13T08:00:00Z', sourceDiagnosisGeneratedAt: '2026-10-13T07:00:00Z', reasonCodes: [], createdAt: '2026-10-13T08:00:00Z', updatedAt: '2026-10-13T08:00:00Z', tasks: [task] }, loading: false, error: false, refetch: vi.fn() }),
    useLearnerProfile: () => ({ data: { courseName: '数据结构' }, loading: false, error: false, refetch: vi.fn() }),
    useDiagnosis: () => ({ data: null, loading: false, error: false, refetch: vi.fn() }),
    useRecentEvidence: () => ({ data: [], loading: false, error: false, refetch: vi.fn() }),
    useKnowledgePoint: () => ({ data: { knowledgePointId: 'kp-array', title: '数组基础', sections: [{ title: '连续存储', content: '数组地址为 $base+i\\times w$。\n\n```cpp\n    int* next(int* current) {\n      return current + 1;\n    }\n```' }] }, loading: false, error: false }),
  };
});

import { LearningSpacePage } from './LearningSpacePage';

describe('LearningSpacePage study deck', () => {
  it('keeps course material and practice visible, with tutoring and evidence expanded on demand', () => {
    const { container } = render(<MemoryRouter initialEntries={['/learning?task_id=task-1']}><LearningSpacePage /></MemoryRouter>);

    expect(screen.getByText('连续存储')).toBeTruthy();
    expect(container.querySelector('.katex')).not.toBeNull();
    const codeBlock = container.querySelector('pre[data-code-language="cpp"][data-show-line-numbers="true"]');
    expect(codeBlock?.querySelector('.markdown-code-line-numbers')?.textContent).toBe('1\n2\n3');
    expect(codeBlock?.querySelector('code')?.textContent).toBe('    int* next(int* current) {\n      return current + 1;\n    }');
    expect(codeBlock?.querySelector('.hljs-type')).not.toBeNull();
    expect(screen.getByText('练习区')).toBeTruthy();
    expect(screen.getByTestId('module-practice').getAttribute('data-knowledge-point-id')).toBe('kp-array');
    expect(screen.getByRole('button', { name: /展开小涟与证据/ })).toBeTruthy();
    expect(screen.queryByText('小涟即时答疑')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /展开小涟与证据/ }));
    expect(screen.getByText('小涟即时答疑')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: '学习产物' })[1]);
    expect(screen.getByText('学习产物内容')).toBeTruthy();
  });
});
