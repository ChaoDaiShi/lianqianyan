import { useEffect, useState } from 'react';
import {
  listKnowledgePoints,
  type KnowledgePointOption,
} from '@/lib/educationApi';
import { ACTIVE_COURSE_ID } from '@/store';

export interface KnowledgePointOptionsState {
  options: KnowledgePointOption[];
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/** 按当前账号课程读取真实知识点，替代各工作区硬编码列表。 */
export function useKnowledgePointOptions(): KnowledgePointOptionsState {
  const [options, setOptions] = useState<KnowledgePointOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listKnowledgePoints(ACTIVE_COURSE_ID)
      .then((items) => {
        if (!cancelled) setOptions(items);
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
  }, [generation]);

  return {
    options,
    loading,
    error,
    reload: () => setGeneration((current) => current + 1),
  };
}
