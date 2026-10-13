// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { KnowledgePointDiagnosis } from '@/domain';
import { CurriculumMasteryMatrix } from './CurriculumMasteryMatrix';

const points: KnowledgePointDiagnosis[] = [
  {
    knowledgePointId: 'kp-list',
    knowledgePointName: '线性表',
    masteryScore: 0.82,
    confidence: 0.8,
    evidenceCount: 4,
    status: 'mastered',
    priorityScore: 0.1,
    reasonCodes: ['STRONG_MASTERY'],
  },
  {
    knowledgePointId: 'kp-cycle',
    knowledgePointName: '循环链表',
    masteryScore: 0,
    confidence: 0,
    evidenceCount: 0,
    status: 'unassessed',
    priorityScore: 0,
    reasonCodes: ['NO_EVIDENCE'],
  },
];

describe('CurriculumMasteryMatrix', () => {
  it('filters by the selected diagnosis state and leaves unknown mastery unscored', () => {
    render(
      <CurriculumMasteryMatrix
        points={points}
        graph={null}
        selectedId={null}
        primaryFocusId={null}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '尚未评估' }));
    expect(screen.getByRole('button', { name: /循环链表/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /线性表/ })).toBeNull();
    expect(screen.getByText('未知状态不显示掌握度')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('opens the selected point and expands its real course sections', () => {
    const onSelect = vi.fn();
    render(
      <CurriculumMasteryMatrix
        points={[points[0]]}
        graph={{
          nodes: [
            { id: 'point:kp-list', label: '线性表', kind: 'knowledge_point', knowledgePointId: 'kp-list', sourceSections: ['线性表 · 定义'] },
            { id: 'section:kp-list:1', label: '顺序表', kind: 'section', knowledgePointId: 'kp-list', sourceSections: ['线性表 · 定义'] },
          ],
        }}
        selectedId={null}
        primaryFocusId={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /线性表掌握/ }));
    expect(onSelect).toHaveBeenCalledWith(points[0]);
    expect(screen.getByText('顺序表')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: '线性表掌握度' }).getAttribute('aria-valuenow')).toBe('82');
  });
});
