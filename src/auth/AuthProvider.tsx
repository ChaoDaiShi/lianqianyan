import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  authErrorMessage,
  loginAccount,
  logoutAccount,
  registerAccount,
  restoreSession,
  selectAccountCourse,
  type AuthAccount,
} from './authApi';
import {
  AUTH_COURSE_STORAGE_KEY,
  AUTH_LEARNER_STORAGE_KEY,
  clearAuthenticatedContext,
  storeAuthenticatedContext,
} from '@/config/learnerContext';

interface AuthContextValue {
  account: AuthAccount | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  login(username: string, password: string, captchaToken?: string | null): Promise<void>;
  register(payload: { username: string; displayName: string; password: string; captchaToken?: string | null }): Promise<void>;
  selectCourse(courseId: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function contextMatches(account: AuthAccount): boolean {
  if (!account.selectedCourseId) return false;
  return localStorage.getItem(AUTH_LEARNER_STORAGE_KEY) === account.id &&
    localStorage.getItem(AUTH_COURSE_STORAGE_KEY) === account.selectedCourseId;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void restoreSession()
      .then((restored) => {
        setAccount(restored);
        if (!restored) clearAuthenticatedContext(localStorage);
        else if (restored.selectedCourseId && !contextMatches(restored)) {
          storeAuthenticatedContext(localStorage, restored.id, restored.selectedCourseId);
          window.location.reload();
        }
      })
      .catch((cause) => setError(authErrorMessage(cause)))
      .finally(() => setLoading(false));
  }, []);

  const run = useCallback(async (operation: () => Promise<AuthAccount>) => {
    setBusy(true); setError(null);
    try {
      const next = await operation();
      setAccount(next);
      if (next.selectedCourseId) {
        storeAuthenticatedContext(localStorage, next.id, next.selectedCourseId);
        window.location.reload();
      }
    } catch (cause) { setError(authErrorMessage(cause)); }
    finally { setBusy(false); }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    account, loading, busy, error,
    login: (username, password, captchaToken) => run(() => loginAccount(username, password, captchaToken)),
    register: (payload) => run(() => registerAccount(payload)),
    selectCourse: async (courseId) => {
      await run(() => selectAccountCourse(courseId));
    },
    logout: async () => {
      setBusy(true); setError(null);
      try { await logoutAccount(); }
      finally {
        clearAuthenticatedContext(localStorage);
        setAccount(null); setBusy(false);
        window.location.reload();
      }
    },
  }), [account, busy, error, loading, run]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
