import { useEffect, useState } from 'react';
import { fetchMastery, type MasteryState } from '@/lib/educationApi';
import { ACTIVE_LEARNER_ID } from '@/store';

interface UseMasteryStateResult {
  state: MasteryState | null;
  loading: boolean;
  error: boolean;
}

/**
 * 读取某知识点的**真实**掌握状态。
 * 后端不可达时返回 error（调用方可回退到 Mock 值）。
 */
export function useMasteryState(
  knowledgePointId: string,
  fallback: number | null = null
): UseMasteryStateResult & { masteryScore: number } {
  const [state, setState] = useState<MasteryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchMastery(ACTIVE_LEARNER_ID, knowledgePointId)
      .then((data) => {
        if (!cancelled) setState(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [knowledgePointId]);

  const masteryScore = state ? state.masteryScore : fallback ?? 0;

  return { state, loading, error, masteryScore };
}
