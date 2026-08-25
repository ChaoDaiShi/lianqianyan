import { create } from 'zustand';
import {
  startLearning,
  type LearningStartResult,
} from '@/lib/educationApi';
import { ACTIVE_LEARNER_ID } from '@/config/learnerContext';

interface StartParams {
  source: 'current_study_plan' | 'recommended_path';
  knowledgePointId?: string;
  courseId?: string;
  topic?: string;
}

interface LearningState {
  starting: boolean;
  lastResult: LearningStartResult | null;
  error: string | null;
  start: (params: StartParams) => Promise<LearningStartResult | null>;
}

/**
 * 开始一段学习的状态。
 * 触发 POST /api/learning/start，记录 `learning_started` 行为证据（不改掌握度）。
 */
export const useLearningStore = create<LearningState>((set) => ({
  starting: false,
  lastResult: null,
  error: null,
  async start(params) {
    set({ starting: true, error: null });
    try {
      const result = await startLearning({
        learnerId: ACTIVE_LEARNER_ID,
        ...params,
      });
      set({ starting: false, lastResult: result });
      return result;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : '记录学习开始失败，请确认后端已启动';
      set({ starting: false, error: msg });
      return null;
    }
  },
}));
