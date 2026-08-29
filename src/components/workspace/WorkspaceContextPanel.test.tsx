// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentChatResponse, LearningEvidence } from '@/lib/educationApi';
import type { PersistedStudyTask } from '@/domain';
import { WorkspaceContextPanel } from './WorkspaceContextPanel';

afterEach(() => cleanup());

const task = {
  id: 'task-1',
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  actionType: 'learn',
  estimatedMinutes: 15,
  order: 1,
} as unknown as PersistedStudyTask;

function evidenceItem(id: string, type: LearningEvidence['evidenceType']): LearningEvidence {
  return {
    id,
    learnerId: 'learner-1',
    evidenceType: type,
    source: 'current_study_plan',
    courseId: 'course-os',
    knowledgePointId: 'kp-deadlock',
    occurredAt: '2026-08-29T10:00:00Z',
    payload: {},
  };
}

const response: AgentChatResponse = {
  selectedCapability: 'tutoring',
  answer: '死锁需要四个条件同时成立。',
  responseMode: 'provider',
  provider: 'deepseek',
  model: 'deepseek-v4-flash',
  sources: [
    { id: 'src-1', title: '死锁 · 定义', section: '死锁 · 定义', knowledgePointId: 'kp-deadlock', excerpt: '死锁是多个进程……' },
  ],
  contextUsed: ['course_knowledge'],
  suggestedActions: [],
  agentTrace: [
    { type: 'agent', agent: 'tutor', label: 'Tutor Agent', status: 'ok' },
    { type: 'tool', name: 'knowledge.search', label: '课程检索', status: 'ok' },
  ] as AgentChatResponse['agentTrace'],
};

describe('WorkspaceContextPanel', () => {
  const baseProps = () => ({
    courseName: '操作系统',
    task,
    planTaskCount: 3,
    currentDiagnosis: null,
    diagnosisLoading: false,
    learnerId: 'learner-1',
    courseId: 'course-os',
    evidence: [
      evidenceItem('ev-1', 'learning_started'),
      evidenceItem('ev-2', 'practice_answer_evaluated'),
    ],
    evidenceLoading: false,
    evidenceError: false,
    onRetryEvidence: vi.fn(),
    response,
  });

  it('shows the five context fields without pulling in the full profile', () => {
    render(<WorkspaceContextPanel {...baseProps()} />);
    for (const label of ['当前课程', '当前知识点', '当前任务', '计划位置', '诊断状态']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText('操作系统')).toBeTruthy();
    expect(screen.getByText(/第 1 \/ 3 项/)).toBeTruthy();
    expect(screen.queryByText(/成长维度雷达/)).toBeNull();
  });

  it('summarises evidence with a collapsed full-history view', () => {
    render(<WorkspaceContextPanel {...baseProps()} />);
    expect(screen.getByText(/评价证据 · 2 条/)).toBeTruthy();
    expect(screen.getByText(/最近证据/)).toBeTruthy();
    fireEvent.click(screen.getByText('查看全部证据'));
    const all = screen.getAllByText(/完成练习评价 ·/);
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps agent/tool/provider details behind a collapsed technical section', () => {
    render(<WorkspaceContextPanel {...baseProps()} />);
    const details = document.querySelector('[data-runtime-details="true"]') as HTMLDetailsElement | null;
    expect(details).toBeTruthy();
    expect(details!.open).toBe(false);
    fireEvent.click(screen.getByText(/技术详情/));
    expect(details!.open).toBe(true);
    expect(screen.getByText(/Provider：deepseek · deepseek-v4-flash/)).toBeTruthy();
    expect(screen.getByText('Tutor Agent')).toBeTruthy();
    expect(screen.getByText('knowledge.search')).toBeTruthy();
  });

  it('keeps voice attribution inside a collapsed section by default', () => {
    render(<WorkspaceContextPanel {...baseProps()} />);
    const details = screen.getByText(/语音服务详情/).closest('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    fireEvent.click(screen.getByText(/语音服务详情/));
    expect(details.open).toBe(true);
    expect(screen.getAllByText(/Genie-TTS 2\.0\.2/).length).toBeGreaterThan(0);
  });
});
