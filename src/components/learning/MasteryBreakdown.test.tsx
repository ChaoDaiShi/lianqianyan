// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MasteryBreakdown } from './MasteryBreakdown';

describe('mastery breakdown', () => {
  it('sorts actual assessed values while keeping an unknown point distinct from zero mastery', () => {
    render(<MasteryBreakdown points={[
      { label: '链表', value: 80, evidenceCount: 3 },
      { label: '树', value: 30, evidenceCount: 2 },
      { label: '图', value: null, evidenceCount: 0 },
    ]} />);
    const labels = () => screen.getAllByRole('row').slice(1).map(row => row.textContent);
    expect(labels()[0]).toContain('树');
    expect(labels()[2]).toContain('未评估');
    expect(labels()[2]).not.toContain('0%');
    fireEvent.change(screen.getByLabelText('能力对照排序'), { target: { value: 'course' } });
    expect(labels()[0]).toContain('链表');
  });
});
