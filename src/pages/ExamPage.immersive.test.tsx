// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ExamPage } from './ExamPage';

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children, immersive }: { children: ReactNode; immersive?: boolean }) => (
    <main data-immersive={immersive}>{children}</main>
  ),
}));
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));
vi.mock('@/components/exam/ExamCatalog', () => ({
  ExamCatalog: ({ onImmersiveChange }: { onImmersiveChange: (value: boolean) => void }) => (
    <button type="button" onClick={() => onImmersiveChange(true)}>开始实际 attempt</button>
  ),
}));
vi.mock('@/components/exam/ExamHistory', () => ({ ExamHistory: () => null }));
vi.mock('@/components/exam/QuestionBank', () => ({ QuestionBank: () => null }));
vi.mock('@/components/exam/ExamBuilder', () => ({ ExamBuilder: () => null }));
vi.mock('@/components/exam/ExamGenerator', () => ({ ExamGenerator: () => null }));

afterEach(() => cleanup());

describe('ExamPage immersive shell', () => {
  it('hides the exam page header and app shell after the catalog enters an attempt', () => {
    const { container } = render(<ExamPage />);
    const shell = container.querySelector('[data-immersive]');
    expect(shell?.getAttribute('data-immersive')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: '开始实际 attempt' }));

    expect(shell?.getAttribute('data-immersive')).toBe('true');
    expect(container.querySelector('header')?.className).toContain('hidden');
  });
});
