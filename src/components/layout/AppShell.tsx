import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { NebulaBackground } from '@/components/design/NebulaBackground';
import { PageTransition } from '@/components/design/PageTransition';
import { LearningRail } from './LearningRail';
import { TopCompanionBar } from './TopCompanionBar';

interface AppShellProps {
  children: ReactNode;
  companion?: ReactNode;
}

/** 星海学院应用外壳：陪伴状态栏、学习星轨与页面级小涟陪伴席。 */
export function AppShell({ children, companion }: AppShellProps) {
  const location = useLocation();
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[var(--em-canvas)] text-[var(--em-ink)]">
      <NebulaBackground />
      <TopCompanionBar />
      <LearningRail currentPath={location.pathname} />
      <main className="relative z-10 pb-28 pt-16 md:pb-10 md:pl-24">
        <PageTransition className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-10">
          {companion ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
              <div className="min-w-0">{children}</div>
              <aside className="xl:sticky xl:top-24">{companion}</aside>
            </div>
          ) : children}
        </PageTransition>
      </main>
    </div>
  );
}
