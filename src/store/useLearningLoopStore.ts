import { create } from 'zustand';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import type { PracticeEvaluationResponse } from '@/lib/educationApi';

export interface LearningLoopStore {
  reflectionResults: Record<string, ReflectionResult>;
  practiceEvaluations: Record<string, PracticeEvaluationResponse>;
  setReflectionResult: (result: ReflectionResult) => void;
  setPracticeEvaluation: (
    taskId: string,
    result: PracticeEvaluationResponse,
  ) => void;
}

export const useLearningLoopStore = create<LearningLoopStore>((set) => ({
  reflectionResults: {},
  practiceEvaluations: {},
  setReflectionResult: (result) =>
    set((state) => ({
      reflectionResults: {
        ...state.reflectionResults,
        [result.knowledgePointId]: result,
      },
    })),
  setPracticeEvaluation: (taskId, result) =>
    set((state) => ({
      practiceEvaluations: {
        ...state.practiceEvaluations,
        [taskId]: result,
      },
    })),
}));
