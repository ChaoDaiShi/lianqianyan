import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PersistedStudyPlan, PersistedStudyTask } from '@/domain';
import type { LearningStartResult } from '@/lib/educationApi';
import {
  useLearningLoopStore,
  useLearningStore,
  useWorkspaceStore,
} from '@/store';

interface StartPlanTaskLearningInput {
  plan: PersistedStudyPlan;
  task: PersistedStudyTask;
  startLearning: (params: {
    source: 'current_study_plan';
    courseId: string;
    knowledgePointId: string;
    topic: string;
  }) => Promise<LearningStartResult | null>;
  setLearningSessionId: (taskId: string, sessionId: string) => void;
}

export async function startPlanTaskLearning({
  plan,
  task,
  startLearning,
  setLearningSessionId,
}: StartPlanTaskLearningInput): Promise<LearningStartResult | null> {
  const result = await startLearning({
    source: 'current_study_plan',
    courseId: plan.courseId,
    knowledgePointId: task.knowledgePointId,
    topic: task.knowledgePointName,
  });

  if (result) setLearningSessionId(task.id, result.sessionId);
  return result;
}

export function useStartPlanTask() {
  const navigate = useNavigate();
  const startLearning = useLearningStore((state) => state.start);
  const setLearningSessionId = useLearningLoopStore(
    (state) => state.setLearningSessionId,
  );
  const setContext = useWorkspaceStore((state) => state.setContext);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTask = useCallback(
    async (plan: PersistedStudyPlan, task: PersistedStudyTask) => {
      setStartingTaskId(task.id);
      setError(null);
      const result = await startPlanTaskLearning({
        plan,
        task,
        startLearning,
        setLearningSessionId,
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
    [navigate, setContext, setLearningSessionId, startLearning]
  );

  return { startTask, startingTaskId, error };
}
