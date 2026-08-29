import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { fetchAccountSettings, updateAccountTheme } from '@/lib/settingsApi';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference(value: ThemePreference): Promise<void>;
}

const STORAGE_KEY = 'educationmind.theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function savedPreference(): ThemePreference {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : 'system';
}

function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(preference: ThemePreference): 'light' | 'dark' {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const [preference, setPreferenceState] = useState<ThemePreference>(savedPreference);
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    applyTheme(savedPreference()),
  );

  useEffect(() => {
    if (!account) return;
    void fetchAccountSettings()
      .then((settings) => {
        localStorage.setItem(STORAGE_KEY, settings.theme);
        setPreferenceState(settings.theme);
        setResolved(applyTheme(settings.theme));
      })
      .catch(() => undefined);
  }, [account]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const refresh = () => {
      if (preference === 'system') setResolved(applyTheme('system'));
    };
    media.addEventListener?.('change', refresh);
    return () => media.removeEventListener?.('change', refresh);
  }, [preference]);

  const setPreference = useCallback(async (value: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, value);
    setPreferenceState(value);
    setResolved(applyTheme(value));
    if (account) await updateAccountTheme(value);
  }, [account]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
