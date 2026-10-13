// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { composeReflectionAnswers } from './reflectionPresentation';
import { ReflectionWorkspace } from './ReflectionWorkspace';

vi.mock('@/components/xiaolian/XiaolianFeedbackBubble', () => ({ XiaolianFeedbackBubble: () => null }));

afterEach(() => cleanup());

describe('ReflectionWorkspace metacognitive prompts', () => {
  it('requires all three answers and submits their composed text through the existing feedback flow', async () => {
    const onComplete = vi.fn();
    render(
      <ReflectionWorkspace
        learnerId="learner-1"
        courseId="course-1"
        taskId="task-1"
        knowledge={{
          knowledgePointId: 'kp-list',
          title: '链表',
          sections: [
            { title: '指针转移', content: '先保存目标节点。' },
            { title: '边界检查', content: '处理空节点。' },
          ],
        }}
        onComplete={onComplete}
      />,
    );

    const blindSpot = screen.getByLabelText(/本次练习中，我最初的思维盲区在哪里/);
    const keyLogic = screen.getByLabelText(/指针转移顺序/);
    const firstCheck = screen.getByLabelText(/第一排查步骤/);
    const submit = screen.getByRole('button', { name: '提交复述' });

    expect(submit.hasAttribute('disabled')).toBe(true);
    fireEvent.change(blindSpot, { target: { value: '没有先检查空节点。' } });
    fireEvent.change(keyLogic, { target: { value: '先保存目标节点，再调整指针转移。' } });
    expect(submit.hasAttribute('disabled')).toBe(true);
    fireEvent.change(firstCheck, { target: { value: '先检查空节点，再核对指针转移。' } });
    fireEvent.click(submit);

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(onComplete.mock.calls[0][0].submittedText).toBe(composeReflectionAnswers({
      blindSpot: '没有先检查空节点。',
      keyLogic: '先保存目标节点，再调整指针转移。',
      firstCheck: '先检查空节点，再核对指针转移。',
    }));
    expect(screen.getByText(/没有将复述写入服务端/)).not.toBeNull();
  });
});
