import { useCallback, useEffect, useRef, useState } from 'react';
import {
  chatWithAgents,
  chatWithTutor,
  fetchCurrentPlan,
  fetchDiagnosis,
  fetchKnowledgePoint,
  fetchLearnerProfile,
  fetchLlmStatus,
  fetchPlanHistory,
  fetchRecentEvidence,
  fetchToolCatalog,
  generatePlan,
  type TutorChatResponse,
  type AgentCapability,
  type AgentChatResponse,
  type KnowledgePointContent,
  type LlmStatus,
  type ToolDefinition,
} from '@/lib/educationApi';
import type {
  DiagnosisResult,
  LearnerProfile,
  PersistedStudyPlan,
  PersistedStudyPlanSummary,
  LearningEvidence,
} from '@/domain';

/**
 * 统一 API Hooks —— 避免每个组件自写 useEffect + fetch。
 *
 * 刷新策略（本轮简单即可）：
 * - 页面 mount → fetch；
 * - Practice success → refetch Profile / Diagnosis；
 * - Generate Plan success → refetch Latest Plan。
 * 不引入 React Query / WebSocket / SSE。
 */

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  refetch: () => Promise<boolean>;
}

function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestGenerationRef = useRef(0);

  const refetch = useCallback(async (): Promise<boolean> => {
    const requestGeneration = ++requestGenerationRef.current;
    setLoading(true);
    setError(false);
    try {
      const nextData = await fetcher();
      if (requestGeneration !== requestGenerationRef.current) return false;
      setData(nextData);
      return true;
    } catch {
      if (requestGeneration === requestGenerationRef.current) setError(true);
      return false;
    } finally {
      if (requestGeneration === requestGenerationRef.current) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    setData(null);
    setLoading(true);
    setError(false);
    void refetch();
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [refetch]);

  return { data, loading, error, refetch };
}

/** GET /api/profile/{learner_id} */
export function useLearnerProfile(
  learnerId: string,
  courseId: string
): AsyncState<LearnerProfile> {
  return useAsync(() => fetchLearnerProfile(learnerId, courseId), [learnerId, courseId]);
}

/** GET /api/diagnosis/{learner_id} */
export function useDiagnosis(
  learnerId: string,
  courseId: string
): AsyncState<DiagnosisResult> {
  return useAsync(() => fetchDiagnosis(learnerId, courseId), [learnerId, courseId]);
}

export interface CurrentPlanState {
  summary: PersistedStudyPlanSummary | null;
  /** 完整 Plan（含 Tasks）；无当前计划时为 null */
  plan: PersistedStudyPlan | null;
  loading: boolean;
  /** current 读取失败（网络 / 500，不含 404 空状态） */
  error: boolean;
  refetch: () => Promise<boolean>;
}

/** 完整 Plan → 摘要（generate 成功后复用，避免二次请求 History）。 */
function toSummary(plan: PersistedStudyPlan): PersistedStudyPlanSummary {
  return {
    id: plan.id,
    learnerId: plan.learnerId,
    courseId: plan.courseId,
    strategy: plan.strategy,
    status: plan.status,
    generatedAt: plan.generatedAt,
    createdAt: plan.createdAt,
    taskCount: plan.tasks.length,
    reasonCodes: plan.reasonCodes,
  };
}

/**
 * 当前学习计划（Phase 3-1 正式语义）：
 * GET /api/plans/current 读取唯一 ACTIVE 计划；404 → 无当前计划（诚实空状态）。
 *
 * 平台已实现 Active 唯一性：generate 时旧 ACTIVE 自动 supersede，
 * 因此「当前计划」不再是 History 第一条的临时近似。
 */
export function useCurrentPlan(
  learnerId: string,
  courseId: string
): CurrentPlanState & {
  generate: () => Promise<PersistedStudyPlan | null>;
  generating: boolean;
} {
  const [summary, setSummary] = useState<PersistedStudyPlanSummary | null>(null);
  const [plan, setPlan] = useState<PersistedStudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const requestGenerationRef = useRef(0);

  const load = useCallback(async (): Promise<boolean> => {
    const requestGeneration = ++requestGenerationRef.current;
    setLoading(true);
    setGenerating(false);
    setError(false);
    try {
      const current = await fetchCurrentPlan(learnerId, courseId);
      if (requestGeneration !== requestGenerationRef.current) return false;
      setPlan(current);
      setSummary(current ? toSummary(current) : null);
      return true;
    } catch {
      if (requestGeneration === requestGenerationRef.current) setError(true);
      return false;
    } finally {
      if (requestGeneration === requestGenerationRef.current) setLoading(false);
    }
  }, [learnerId, courseId]);

  useEffect(() => {
    setSummary(null);
    setPlan(null);
    setLoading(true);
    setError(false);
    setGenerating(false);
    void load();
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [load]);

  const generate = useCallback(async (): Promise<PersistedStudyPlan | null> => {
    const requestGeneration = ++requestGenerationRef.current;
    setGenerating(true);
    setLoading(false);
    setError(false);
    try {
      const created = await generatePlan(learnerId, courseId);
      if (requestGeneration !== requestGenerationRef.current) return null;
      setPlan(created);
      setSummary(toSummary(created));
      return created;
    } catch {
      if (requestGeneration === requestGenerationRef.current) setError(true);
      return null;
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        setGenerating(false);
        setLoading(false);
      }
    }
  }, [learnerId, courseId]);

  return { summary, plan, loading, error, refetch: load, generate, generating };
}

/** GET /api/plans —— 计划历史（含已 supersede 的计划，latest 在前）。 */
export function usePlanHistory(
  learnerId: string,
  courseId: string
): AsyncState<PersistedStudyPlanSummary[]> {
  return useAsync(() => fetchPlanHistory(learnerId, courseId), [learnerId, courseId]);
}

/** POST /api/tutor/chat —— 发送一条学生提问。 */
export function useTutorChat(learnerId: string, courseId: string) {
  const [pending, setPending] = useState(false);
  const send = useCallback(
    async (message: string): Promise<TutorChatResponse | null> => {
      if (!message.trim()) return null;
      setPending(true);
      try {
        return await chatWithTutor({
          learnerId,
          courseId,
          message,
        });
      } catch {
        return null;
      } finally {
        setPending(false);
      }
    },
    [learnerId, courseId]
  );

  return { send, pending };
}

export function useAgentChat(learnerId: string, courseId: string, knowledgePointId?: string) {
  const [pending, setPending] = useState(false);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    requestGenerationRef.current += 1;
    setPending(false);
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [learnerId, courseId, knowledgePointId]);

  const send = useCallback(
    async (message: string, capability?: AgentCapability | null): Promise<AgentChatResponse | null> => {
      if (!message.trim()) return null;
      const requestGeneration = ++requestGenerationRef.current;
      setPending(true);
      try {
        const response = await chatWithAgents({ learnerId, courseId, message, capability, knowledgePointId });
        return requestGeneration === requestGenerationRef.current ? response : null;
      } catch {
        return null;
      } finally {
        if (requestGeneration === requestGenerationRef.current) setPending(false);
      }
    },
    [learnerId, courseId, knowledgePointId]
  );
  return { send, pending };
}

export function useKnowledgePoint(
  knowledgePointId: string | undefined,
  courseId: string
): AsyncState<KnowledgePointContent> {
  return useAsync(
    () => {
      if (!knowledgePointId) return Promise.reject(new Error('knowledge point is required'));
      return fetchKnowledgePoint(knowledgePointId, courseId);
    },
    [knowledgePointId, courseId]
  );
}

export function useToolCatalog(): AsyncState<ToolDefinition[]> {
  return useAsync(fetchToolCatalog, []);
}

export function useLlmStatus(): AsyncState<LlmStatus> {
  return useAsync(fetchLlmStatus, []);
}

/** GET /api/learning/evidence —— 最近学习行为（报告展示用）。 */
export function useRecentEvidence(): AsyncState<LearningEvidence[]> {
  return useAsync(() => fetchRecentEvidence(), []);
}
