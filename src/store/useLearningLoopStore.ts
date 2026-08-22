import { create } from 'zustand';
import type { ReflectionResult } from '@/components/learning/learningLoop';
import type {
  AgentChatResponse,
  PracticeEvaluationResponse,
} from '@/lib/educationApi';

export interface LearningLoopStore {
  learningSessionIds: Record<string, string>;
  reflectionResults: Record<string, ReflectionResult>;
  practiceEvaluations: Record<string, PracticeEvaluationResponse>;
  tutorResponses: Record<string, AgentChatResponse>;
  setLearningSessionId: (taskId: string, sessionId: string) => void;
  setReflectionResult: (taskId: string, result: ReflectionResult) => void;
  setPracticeEvaluation: (
    taskId: string,
    result: PracticeEvaluationResponse,
  ) => void;
  setTutorResponse: (taskId: string, response: AgentChatResponse) => void;
}

export const useLearningLoopStore = create<LearningLoopStore>((set) => ({
  learningSessionIds: {},
  reflectionResults: {},
  practiceEvaluations: {},
  tutorResponses: {},
  setLearningSessionId: (taskId, sessionId) =>
    set((state) => {
      if (state.learningSessionIds[taskId] === sessionId) return state;

      const {
        [taskId]: _reflectionResult,
        ...reflectionResults
      } = state.reflectionResults;
      const {
        [taskId]: _practiceEvaluation,
        ...practiceEvaluations
      } = state.practiceEvaluations;
      const {
        [taskId]: _tutorResponse,
        ...tutorResponses
      } = state.tutorResponses;

      return {
        learningSessionIds: {
          ...state.learningSessionIds,
          [taskId]: sessionId,
        },
        reflectionResults,
        practiceEvaluations,
        tutorResponses,
      };
    }),
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
  setTutorResponse: (taskId, response) =>
    set((state) => ({
      tutorResponses: {
        ...state.tutorResponses,
        [taskId]: response,
      },
    })),
}));
