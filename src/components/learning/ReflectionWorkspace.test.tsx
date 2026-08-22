import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ReflectionResult } from './learningLoop';
import { ReflectionWorkspace } from './ReflectionWorkspace';

const result: ReflectionResult = {
  learnerId: 'learner-1',
  courseId: 'course-1',
  taskId: 'task-1',
  knowledgePointId: 'kp-deadlock',
  knowledgePointName: '死锁',
  submittedText: '互斥条件会限制资源共享。',
  submittedAt: '2026-08-22T10:00:00.000Z',
  coveredConcepts: ['互斥条件'],
  missingConcepts: ['循环等待'],
  nextSuggestion: '建议回看“循环等待”课程章节，再补充复述。',
};

describe('ReflectionWorkspace', () => {
  it('renders completed deterministic feedback and Xiaolian growth feedback from ReflectionResult', () => {
    const onComplete = vi.fn();
    const html = renderToStaticMarkup(
      <ReflectionWorkspace
        learnerId="learner-1"
        courseId="course-1"
        taskId="task-1"
        knowledge={{
          knowledgePointId: 'kp-deadlock',
          title: '死锁',
          sections: [
            { title: '互斥条件', content: '资源不能同时共享。' },
            { title: '循环等待', content: '进程形成环形等待链。' },
          ],
        }}
        initialResult={result}
        onComplete={onComplete}
      />,
    );

    expect(html).toContain('当前知识点');
    expect(html).toContain('复述目标');
    expect(html).toContain('当前为前端教学反馈演示，不代表 AI 自动评分');
    expect(html).toContain('已覆盖概念');
    expect(html).toContain('待补充概念');
    expect(html).toContain('互斥条件');
    expect(html).toContain('循环等待');
    expect(html).toContain(result.nextSuggestion);
    expect(html).toContain('小涟观察到');
    expect(html).toContain('不会更新学习者画像、LearningEvidence 或 mastery');
    expect(onComplete).not.toHaveBeenCalled();
  });
});
