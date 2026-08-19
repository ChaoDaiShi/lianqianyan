/**
 * Demo 教学讲解内容 —— 集中管理，从 JSX 中分离。
 *
 * ⚠️ 边界声明：本文件是**教学演示内容**（静态教学讲解文本 / 固定练习题 / 快捷问题），
 * 不是 Learner State Mock。掌握度 / 画像 / 诊断 / 计划 / Tutor 回答 / 练习评价
 * 一律走真实 Education API，绝不在此处伪造。
 *
 * 本轮不开发完整课程内容系统，仅为主知识点（死锁 kp-deadlock）提供
 * 第一版演示讲解 + 固定练习题，其余知识点回退到通用占位。
 */

export interface LearningModule {
  /** 标题（讲解） */
  title: string;
  /** 结构化要点 */
  points: string[];
  /** 关键理解 */
  keyInsight: string;
  /** 练习组（正确/错误判定由后端决定，这里只提供题目与选项定义） */
  questions: DemoQuestion[];
  /** 快捷问题（嵌入式小涟初始引导） */
  quickQuestions: string[];
}

export interface DemoQuestion {
  id: string;
  knowledgePointId: string;
  difficulty: number;
  prompt: string;
  options: { label: string; correct: boolean }[];
}

/** 通用占位模块（未提供专讲的知识点回退用）。 */
const GENERIC_MODULE: LearningModule = {
  title: '知识点学习与巩固',
  points: [
    '先理解该知识点的核心概念与适用场景。',
    '结合练习检验理解，若掌握度偏低则重点回顾相关例题。',
    '可以向小涟提问，让它结合你的学习画像给出针对性讲解。',
  ],
  keyInsight: '持续完成练习并记录结果，小涟会逐步更新你对这一知识点的掌握评估。',
  questions: [],
  quickQuestions: ['这个知识点最容易在哪里出错？', '可以帮我梳理一下重点吗？'],
};

/** 死锁 —— 本轮的演示主知识点。 */
const DEADLOCK_MODULE: LearningModule = {
  title: '死锁的四个必要条件',
  points: [
    '互斥：资源一次只能被一个进程使用，不能被多个进程同时共享。',
    '请求并保持：进程已经持有一个资源，又在等待另一个被其他进程占用的资源。',
    '不可剥夺：进程获得的资源在未使用完之前，不能被其他进程强行剥夺。',
    '循环等待：存在一个进程 — 资源的环形等待链，每个进程都在等待下一个进程持有的资源。',
  ],
  keyInsight: '四个条件必须同时成立才会产生死锁；只要破坏其中任意一个，死锁即可预防或解除。',
  questions: [
    {
      id: 'question-deadlock-001',
      knowledgePointId: 'kp-deadlock',
      difficulty: 0.6,
      prompt: '以下哪一项不是产生死锁的必要条件？',
      options: [
        { label: '互斥', correct: false },
        { label: '请求并保持', correct: false },
        { label: '可抢占', correct: true },
        { label: '循环等待', correct: false },
      ],
    },
    {
      id: 'question-deadlock-002',
      knowledgePointId: 'kp-deadlock',
      difficulty: 0.55,
      prompt:
        '四个死锁必要条件必须同时满足才会发生死锁。要**预防死锁**，最有效的做法通常是：',
      options: [
        { label: '破坏任意一个必要条件', correct: true },
        { label: '提高 CPU 主频，加快进程执行', correct: false },
        { label: '增加内存容量', correct: false },
        { label: '增加进程数量', correct: false },
      ],
    },
    {
      id: 'question-deadlock-003',
      knowledgePointId: 'kp-deadlock',
      difficulty: 0.65,
      prompt: '银行家算法属于哪一种死锁处理策略？',
      options: [
        { label: '死锁预防', correct: false },
        { label: '死锁避免（在分配资源前判断安全性）', correct: true },
        { label: '死锁检测', correct: false },
        { label: '死锁解除', correct: false },
      ],
    },
  ],
  quickQuestions: [
    '为什么会发生死锁？',
    '死锁的四个必要条件怎么记？',
    '银行家算法是做什么的？',
  ],
};

/** 按知识点 ID 取模块（未提供专讲则回退通用占位）。 */
export function getLearningModule(knowledgePointId: string): LearningModule {
  if (knowledgePointId === 'kp-deadlock') return DEADLOCK_MODULE;
  return GENERIC_MODULE;
}
