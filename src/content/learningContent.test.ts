import { describe, expect, it } from 'vitest';
import { resolveQuickQuestions } from './learningContent';

describe('resolveQuickQuestions', () => {
  it('uses the curated questions for topics that ship a dedicated module', () => {
    const questions = resolveQuickQuestions('kp-deadlock', '死锁');
    expect(questions).toEqual(['为什么会发生死锁？', '死锁的四个必要条件怎么记？', '银行家算法是做什么的？']);
  });

  it('builds topic-specific questions for generic knowledge points', () => {
    const questions = resolveQuickQuestions('kp-pv', 'PV 操作与信号量');
    expect(questions).toHaveLength(3);
    expect(questions[0]).toBe('用生活中的例子解释「PV 操作与信号量」');
    expect(questions[1]).toBe('学「PV 操作与信号量」最容易在哪里出错？');
    expect(questions[2]).toBe('考一考我对「PV 操作与信号量」的掌握');
    expect(questions.join('')).not.toContain('这个知识点');
  });

  it('falls back to generic questions when the topic name is missing', () => {
    const questions = resolveQuickQuestions('kp-unknown');
    expect(questions).toEqual(['这个知识点最容易在哪里出错？', '可以帮我梳理一下重点吗？']);
  });
});
