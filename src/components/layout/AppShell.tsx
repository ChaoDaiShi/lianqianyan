import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { NebulaBackground, type NebulaScene } from '@/components/design/NebulaBackground';
import { PageTransition } from '@/components/design/PageTransition';
import { LearningRail } from './LearningRail';
import { TopCompanionBar } from './TopCompanionBar';

interface AppShellProps {
  children: ReactNode;
  companion?: ReactNode;
  scene?: NebulaScene;
}

/** 星海学院应用外壳：陪伴状态栏、学习星轨与页面级小涟陪伴席。 */
export function AppShell({ children, companion, scene = 'default' }: AppShellProps) {
  const location = useLocation();
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[var(--em-canvas)] text-[var(--em-ink)]" data-ui-scene={scene} data-workspace-shell="responsive">
      <NebulaBackground scene={scene} />
      <TopCompanionBar />
      <LearningRail currentPath={location.pathname} />
      <main data-workspace-content="true" className="relative z-10 min-w-0 pb-[7.5rem] pt-[4.5rem] md:pb-9 md:pl-[6.5rem] xl:pl-[17rem]">
        <PageTransition className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 xl:px-10">
          {companion ? (
            <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_23rem] 2xl:items-start">
              <div className="min-w-0">{children}</div>
              <aside className="min-w-0 2xl:sticky 2xl:top-24">{companion}</aside>
            </div>
          ) : children}
        </PageTransition>
      </main>
    </div>
  );
}
