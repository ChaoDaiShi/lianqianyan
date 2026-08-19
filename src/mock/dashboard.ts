import type {
  Course,
  KnowledgePoint,
  LearnerProfile,
  LearningEvidence,
  StatusCounts,
  StudyPlan,
} from '@/domain';

/**
 * 集中 Mock 数据 —— Web 首页演示的唯一数据来源（Single Source of Truth）。
 *
 * 页面组件一律通过 src/mock 读取数据，禁止在页面内联硬编码演示数据，
 * 以便后续用真实 API（Education API / Learning Evidence）无缝替换。
 */

export interface StatCard {
  key: string;
  label: string;
  value: string;
  hint?: string;
  icon: 'clock' | 'checkSquare' | 'flame' | 'target';
}

export interface StudyTaskView {
  id: string;
  course: string;
  title: string;
  status: 'completed' | 'in_progress' | 'todo';
  meta: string;
}

export interface WeakKnowledgePoint {
  id: string;
  name: string;
  mastery: number;
}

export interface LearningStage {
  key: string;
  title: string;
  description: string;
}

/** 顶部问候（非儿童化、专业温和）。 */
export const greeting = {
  title: '下午好，欢迎回来 👋',
  subtitle: '今天也和小涟一起稳稳地进步吧。',
};

/** 学习数据卡片。 */
export const stats: StatCard[] = [
  { key: 'todayMinutes', label: '今日学习', value: '54 min', icon: 'clock' },
  { key: 'todayTasks', label: '今日任务', value: '3 / 5', icon: 'checkSquare' },
  { key: 'streak', label: '连续学习', value: '12 天', icon: 'flame' },
  { key: 'overallMastery', label: '综合掌握度', value: '72%', icon: 'target' },
];

/** 当前学习计划。 */
export interface PlanOverview {
  name: string;
  overallProgress: number;
  daysToTarget: number;
  courses: Array<{ id: string; name: string; mastery: number; isFocus: boolean }>;
  todayTopic: string;
}

export const planOverview: PlanOverview = {
  name: '软件设计师备考计划',
  overallProgress: 0.42,
  daysToTarget: 73,
  courses: [
    { id: 'course-data-structure', name: '数据结构', mastery: 0.76, isFocus: false },
    { id: 'course-os', name: '操作系统', mastery: 0.58, isFocus: true },
    { id: 'course-network', name: '计算机网络', mastery: 0.67, isFocus: false },
    { id: 'course-database', name: '数据库', mastery: 0.71, isFocus: false },
  ],
  todayTopic: '进程同步与 PV 操作',
};

/** 今日学习任务。 */
export const todayTasks: StudyTaskView[] = [
  {
    id: 'task-linear-list',
    course: '数据结构',
    title: '线性表复习',
    status: 'completed',
    meta: '已完成 · 25 min',
  },
  {
    id: 'task-pv',
    course: '操作系统',
    title: 'PV 操作',
    status: 'in_progress',
    meta: '学习中 · 预计 35 min',
  },
  {
    id: 'task-os-practice',
    course: '操作系统',
    title: '专项练习',
    status: 'todo',
    meta: '待开始 · 15 题',
  },
  {
    id: 'task-mistake-review',
    course: '',
    title: '错题复习',
    status: 'todo',
    meta: '待开始 · 8 题',
  },
];

/** 薄弱知识点。 */
export const weakKnowledgePoints: WeakKnowledgePoint[] = [
  { id: 'kp-pv', name: 'PV 操作', mastery: 0.58 },
  { id: 'kp-deadlock', name: '死锁条件', mastery: 0.61 },
  { id: 'kp-tcp', name: 'TCP 拥塞控制', mastery: 0.64 },
];

/** 小涟建议。 */
export const xiaolianAdvice = {
  title: '小涟建议',
  paragraphs: [
    '你目前最大的薄弱点集中在「进程同步」。',
    '建议先完成 PV 操作学习，再进入死锁相关内容。',
  ],
};

/** 个性化学习路径 —— 首页最重要的比赛展示卡片。 */
export const learningPath = {
  title: '小涟为你准备的下一段学习',
  course: '操作系统',
  topic: '进程同步',
  currentMastery: 0.58,
  estimatedMinutes: 50,
  stages: [
    { key: 'learn', title: '学', description: '结构化知识学习' },
    { key: 'ask', title: '问', description: '与小涟对话' },
    { key: 'explore', title: '探', description: '交互式知识探索' },
    { key: 'practice', title: '练', description: '自适应练习' },
    { key: 'diagnose', title: '诊', description: '错因诊断' },
    { key: 'feynman', title: '述', description: '费曼复述' },
    { key: 'assess', title: '测', description: '掌握度测评' },
  ],
} satisfies {
  title: string;
  course: string;
  topic: string;
  currentMastery: number;
  estimatedMinutes: number;
  stages: LearningStage[];
};

/** 全局小涟 —— 辅助面板。 */
export const xiaolianAssistant = {
  title: '小涟',
  currentLearning: '操作系统 > 进程同步 > PV 操作',
  recommendedQuestions: [
    '为什么 P 操作可能导致阻塞？',
    '信号量初值应该怎么判断？',
    '可以换一种方式给我解释 PV 操作吗？',
  ],
  placeholder: '输入你的问题……',
};

/** 领域模型样例（用于体现 Domain 与 Mock 的关系，便于后续接入 Learning Evidence）。 */
export const mockDomainSamples = {
  courses: [
    {
      id: 'course-data-structure',
      name: '数据结构',
      knowledgePointIds: ['kp-linear-list'],
    },
    {
      id: 'course-os',
      name: '操作系统',
      knowledgePointIds: ['kp-pv', 'kp-deadlock'],
    },
    {
      id: 'course-network',
      name: '计算机网络',
      knowledgePointIds: ['kp-tcp'],
    },
    {
      id: 'course-database',
      name: '数据库',
      knowledgePointIds: [],
    },
  ] as Course[],
  knowledgePoints: [
    { id: 'kp-liner-list', name: '线性表', difficulty: 2, prerequisites: [] },
    { id: 'kp-pv', name: '进程同步与 PV 操作', difficulty: 4, prerequisites: ['kp-process'] },
    { id: 'kp-deadlock', name: '死锁', difficulty: 4, prerequisites: ['kp-pv'] },
    { id: 'kp-tcp', name: 'TCP 拥塞控制', difficulty: 3, prerequisites: [] },
  ] as KnowledgePoint[],
  plan: {
    id: 'plan-001',
    userId: 'user-1',
    name: '软件设计师备考计划',
    overallProgress: 0.42,
    courseIds: ['course-data-structure', 'course-os', 'course-network', 'course-database'],
    isActive: true,
    tasks: [],
    createdAt: '2026-08-12T00:00:00Z',
    updatedAt: '2026-08-12T00:00:00Z',
  } as StudyPlan,
  profile: {
    learnerId: 'demo-user-001',
    courseId: 'course-os',
    courseName: '操作系统',
    overallMastery: 0.62,
    overallConfidence: null,
    insufficientData: false,
    coverage: 0.6,
    totalKnowledgePoints: 5,
    assessedCount: 3,
    unassessedCount: 2,
    statusCounts: {
      unassessed: 0,
      insufficient_evidence: 1,
      weak: 0,
      developing: 2,
      proficient: 1,
      mastered: 0,
    } as StatusCounts,
    knowledgePoints: [],
    updatedAt: '2026-08-12T00:00:00Z',
  } as LearnerProfile,
};

export const mockEvidence: LearningEvidence = {
  id: 'ev-001',
  learnerId: 'demo-user-001',
  evidenceType: 'practice_answer_evaluated',
  source: 'learning_space',
  knowledgePointId: 'kp-pv',
  questionId: 'question-pv-demo-001',
  masteryDelta: 0.05,
  payload: { is_correct: true, score: 1.0, difficulty: 0.6 },
  occurredAt: '2026-08-12T08:00:00Z',
};
