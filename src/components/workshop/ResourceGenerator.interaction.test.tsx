// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { ResourceGenerator } from './ResourceGenerator';
const mocks = vi.hoisted(() => ({ generate: vi.fn(), verify: vi.fn() }));
vi.mock('@/lib/educationApi', () => ({
  listKnowledgePoints: async () => [{ id: 'kp-trees', name: '树', difficulty: 2 }],
  generateLearningResource: mocks.generate,
  verifyResourceText: mocks.verify,
  planResourceImage: async () => ({ shouldGenerate: false, reason: '纯文字', plannedBy: 'rule' }),
  generateResourceImage: vi.fn(), optimizeLearningResource: vi.fn(),
}));
afterEach(cleanup);
it('checks the actual body of each successive generation', async () => {
  mocks.generate.mockResolvedValueOnce({ title: '第一份', content: '第一份正文', format: 'markdown', sourceSections: [] })
    .mockResolvedValueOnce({ title: '第二份', content: '第二份正文', format: 'markdown', sourceSections: [] });
  mocks.verify.mockResolvedValue({ available: true, passed: true, summary: '', issues: [] });
  render(<MemoryRouter><ResourceGenerator /></MemoryRouter>);
  await screen.findByRole('option', { name: /树/ });
  fireEvent.click(screen.getByRole('button', { name: '开始生成' }));
  await waitFor(() => expect(mocks.verify).toHaveBeenNthCalledWith(1, '第一份正文'));
  fireEvent.click(await screen.findByRole('button', { name: '开始生成' }));
  await waitFor(() => expect(mocks.verify).toHaveBeenNthCalledWith(2, '第二份正文'));
});
