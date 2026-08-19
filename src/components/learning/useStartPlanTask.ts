import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PersistedStudyPlan, PersistedStudyTask } from '@/domain';
import { useLearningStore, useWorkspaceStore } from '@/store';

export function useStartPlanTask() {
  const navigate = useNavigate();
  const startLearning = useLearningStore((state) => state.start);
  const setContext = useWorkspaceStore((state) => state.setContext);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTask = useCallback(
    async (plan: PersistedStudyPlan, task: PersistedStudyTask) => {
      setStartingTaskId(task.id);
      setError(null);
      const result = await startLearning({
        source: 'current_study_plan',
        courseId: plan.courseId,
        knowledgePointId: task.knowledgePointId,
        topic: task.knowledgePointName,
      });

      if (!result) {
        setError('暂时无法开始学习，请稍后重试。');
        setStartingTaskId(null);
        return;
      }

      setContext({
        planId: plan.id,
        taskId: task.id,
        knowledgePointId: task.knowledgePointId,
      });
      navigate(
        `/space?plan_id=${encodeURIComponent(plan.id)}&task_id=${encodeURIComponent(
          task.id
        )}&knowledge_point_id=${encodeURIComponent(task.knowledgePointId)}`
      );
      setStartingTaskId(null);
    },
    [navigate, setContext, startLearning]
  );

  return { startTask, startingTaskId, error };
}
