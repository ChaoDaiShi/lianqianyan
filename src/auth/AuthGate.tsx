import type { ReactNode } from 'react';
import { AuthScreen } from './AuthScreen';
import { CourseSelectionScreen } from './CourseSelectionScreen';
import { useAuth } from './AuthProvider';

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth.loading) return <main className="grid min-h-screen place-items-center bg-violet-50 text-violet-700">正在恢复安全会话…</main>;
  if (!auth.account) return <AuthScreen onLogin={auth.login} onRegister={auth.register} busy={auth.busy} error={auth.error} />;
  if (!auth.account.selectedCourseId) return <CourseSelectionScreen displayName={auth.account.displayName} busy={auth.busy} error={auth.error} onSelect={auth.selectCourse} onLogout={auth.logout} />;
  return children;
}
