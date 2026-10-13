// React Hook helpers for data fetching.
import { useState, useEffect, useCallback } from 'react';

export { fetchLeapCatalog, fetchLeapSession, fetchLeapSessions, fetchLeapOverview, createLeapSession, diagnoseLeapSession, startLeapIntervention, practiceLeapSession, prepareLeapProbe, submitLeapProbe, submitLeapRetest, exportLeapExperiments } from './adaptiveApi';

/**
 * Generic async data hook — loading / error / refetch for any `Promise` API.
 *
 * Features:
 * 1. Tracks `loading` around the call
 * 2. Normalizes thrown values to `Error` (including plain API error objects)
 * 3. Re-runs when `deps` change (same semantics as `useEffect`)
 *
 * @param apiCall - Zero-arg function returning a Promise
 * @param deps - Dependency list; default `[]` runs once on mount
 *
 * @example
 * const { data, loading, error } = useApi(() => userApi.getUserInfo());
 */
export function useApi<T>(apiCall: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      setData(result);
    } catch (err: any) {
      // Normalize non-Error throws (e.g. plain `{ message }`) to Error
      const errorObj =
        err instanceof Error ? err : new Error(err?.message || 'Unknown error');
      setError(errorObj);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
