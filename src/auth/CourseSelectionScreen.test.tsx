// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CourseSelectionScreen } from './CourseSelectionScreen';
vi.mock('./authApi', () => ({ listCourses: async () => [
  { id: 'course-os', name: '操作系统', description: '操作系统课程' },
  { id: 'course-ds', name: '数据结构', description: '数据结构课程' },
] }));
afterEach(cleanup);
it('submits the visible selected course instead of the first catalog entry', async () => {
  const onSelect = vi.fn().mockResolvedValue(undefined);
  render(<CourseSelectionScreen displayName="学习者" busy={false} error={null} onSelect={onSelect} onLogout={vi.fn()} />);
  const course = await screen.findByRole('radio', { name: /数据结构/ });
  const submit = screen.getByRole('button', { name: /完成初始化/ });
  expect((submit as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(course);
  fireEvent.click(submit);
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith('course-ds'));
});
