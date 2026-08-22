import { create } from 'zustand';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import type { PracticeEvaluationResponse } from '@/lib/educationApi';

export interface LearningLoopStore {
  learningSessionIds: Record<string, string>;
  reflectionResults: Record<string, ReflectionResult>;
  practiceEvaluations: Record<string, PracticeEvaluationResponse>;
  setLearningSessionId: (taskId: string, sessionId: string) => void;
  setReflectionResult: (taskId: string, result: ReflectionResult) => void;
  setPracticeEvaluation: (
    taskId: string,
    result: PracticeEvaluationResponse,
  ) => void;
}

export const useLearningLoopStore = create<LearningLoopStore>((set) => ({
  learningSessionIds: {},
  reflectionResults: {},
  practiceEvaluations: {},
  setLearningSessionId: (taskId, sessionId) =>
    set((state) => ({
      learningSessionIds: {
        ...state.learningSessionIds,
        [taskId]: sessionId,
      },
    })),
  setReflectionResult: (taskId, result) =>
    set((state) => ({
      reflectionResults: {
        ...state.reflectionResults,
        [taskId]: result,
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
