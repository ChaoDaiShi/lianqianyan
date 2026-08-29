// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { KnowledgePointDiagnosis, PersistedStudyTask } from '@/domain';
import type { KnowledgeSource } from '@/lib/educationApi';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

import { WorkbenchTaskHeader } from '@/components/learning/WorkbenchTaskHeader';
import { WorkspaceArtifactsPanel } from './WorkspaceArtifactsPanel';

afterEach(() => cleanup());

const task = {
  id: 'task-1',
  planId: 'plan-1',
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  actionType: 'learn',
  estimatedMinutes: 15,
  order: 1,
} as unknown as PersistedStudyTask;

const plan = {
  id: 'plan-1',
  tasks: [task],
} as unknown as Parameters<typeof WorkbenchTaskHeader>[0]['plan'];

describe('WorkbenchTaskHeader panel entries', () => {
  it('exposes history, artifacts and context via icons on desktop and a mobile menu', () => {
    const onOpenPanel = vi.fn();
    const html = render(
      <WorkbenchTaskHeader plan={plan} task={task} state="learning" onOpenPanel={onOpenPanel} />,
    );
    expect(screen.getByTitle('历史记录')).toBeTruthy();
    expect(screen.getByTitle('学习产物')).toBeTruthy();
    expect(screen.getByTitle('学习上下文')).toBeTruthy();

    // 移动端 ··· 菜单
    fireEvent.click(screen.getByLabelText('更多功能'));
    fireEvent.click(screen.getByText('历史记录'));
    expect(onOpenPanel).toHaveBeenCalledWith('history');
    void html;
  });

  it('renders no panel entries when onOpenPanel is absent', () => {
    render(<WorkbenchTaskHeader plan={plan} task={task} state="learning" />);
    expect(screen.queryByLabelText('更多功能')).toBeNull();
    expect(screen.queryByTitle('历史记录')).toBeNull();
  });
});

describe('WorkspaceArtifactsPanel', () => {
  const diagnosis = {
    knowledgePointId: 'kp-deadlock',
    knowledgePointName: '死锁',
    status: 'developing',
    masteryScore: 0.52,
    confidence: 0.8,
    evidenceCount: 4,
  } as KnowledgePointDiagnosis;
  const sources: KnowledgeSource[] = [
    { id: 'src-1', title: '死锁 · 定义', section: '死锁 · 定义', knowledgePointId: 'kp-deadlock', excerpt: '死锁是多个进程……' },
  ];

  function baseProps() {
    return {
      scope: 'task' as const,
      onScopeChange: vi.fn(),
      task,
      knowledge: null,
      knowledgeLoading: false,
      knowledgeError: false,
      currentDiagnosis: diagnosis,
      isPrimaryFocus: true,
      sources,
      practiceEvaluation: null,
      reflection: null,
      evidenceLearningStarted: 2,
      evidencePracticeEvaluated: 1,
    };
  }

  it('groups knowledge summary, diagnosis feedback and sources with scope switcher', () => {
    const props = baseProps();
    render(<WorkspaceArtifactsPanel {...props} />);
    expect(screen.getByText('知识总结')).toBeTruthy();
    expect(screen.getByText('当前重点')).toBeTruthy();
    expect(screen.getByText('来源引用')).toBeTruthy();
    expect(screen.getByText(/掌握度 52%/)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: '本次会话' }));
    expect(props.onScopeChange).toHaveBeenCalledWith('session');
  });

  it('renders the generated-resource pointer only in session scope', () => {
    render(<WorkspaceArtifactsPanel {...baseProps()} scope="session" />);
    expect(screen.getByText(/学习资源在/)).toBeTruthy();
    expect(screen.queryByText('当前重点')).toBeNull();
  });

  it('keeps local reflection artifacts honestly labelled', () => {
    render(
      <WorkspaceArtifactsPanel
        {...baseProps()}
        reflection={{
          learnerId: 'learner-1',
          courseId: 'course-os',
          taskId: 'task-1',
          submittedText: '死锁需要四个条件同时成立。',
          knowledgePointName: '死锁',
          knowledgePointId: 'kp-deadlock',
          submittedAt: '2026-08-29T12:00:00Z',
          coveredConcepts: ['互斥条件'],
          missingConcepts: [],
          nextSuggestion: '继续巩固。',
        }}
      />,
    );
    expect(screen.getByText('复述结果')).toBeTruthy();
    expect(screen.getByText(/本地复述记录 · 刷新后清除/)).toBeTruthy();
  });
});
