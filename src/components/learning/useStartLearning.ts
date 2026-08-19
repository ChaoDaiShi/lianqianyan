import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLearningStore } from '@/store';

interface StartParams {
  source: 'current_study_plan' | 'recommended_path';
  knowledgePointId?: string;
  courseId?: string;
  topic?: string;
}

/**
 * 开启学习的流程钩子。
 *
 *   start() -> POST /api/learning/evidence(start) -> 持久化 SQLite
 *            -> 返回 evidence id
 *            -> 提示「小涟已记录本次学习开始」-> 进入学习空间（/space）
 */
export function useStartLearning() {
  const navigate = useNavigate();
  const starting = useLearningStore((s) => s.starting);
  const lastResult = useLearningStore((s) => s.lastResult);
  const error = useLearningStore((s) => s.error);
  const startAction = useLearningStore((s) => s.start);

  const start = useCallback(
    async (params: StartParams) => {
      const result = await startAction(params);
      if (result) {
        navigate('/space');
      }
      return result;
    },
    [startAction, navigate]
  );

  return { starting, lastResult, error, start };
}
