import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import { XiaolianFeedbackBubble } from './XiaolianFeedbackBubble';

describe('XiaolianFeedbackBubble reflection growth feedback', () => {
  it('renders growth feedback only from ReflectionResult', () => {
    const result: ReflectionResult = {
      learnerId: 'learner-1',
      courseId: 'course-os',
      taskId: 'task-1',
      knowledgePointId: 'kp-deadlock',
      knowledgePointName: '死锁',
      submittedText: '互斥条件',
      submittedAt: '2026-08-22T09:00:00.000Z',
      coveredConcepts: ['互斥条件'],
      missingConcepts: ['循环等待'],
      nextSuggestion: '建议回看“循环等待”课程章节，再补充复述。',
    };

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderToStaticMarkup(
      <XiaolianFeedbackBubble scenario="reflection_completed" result={result} />,
    );

    expect(html).toContain('小涟观察到');
    expect(html).toContain('互斥条件');
    expect(html).toContain('循环等待');
    expect(html).toContain(result.nextSuggestion);
    expect(html).not.toContain('我记得你说过');
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
