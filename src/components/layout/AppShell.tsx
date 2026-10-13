import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { WorkbenchBackground } from '@/components/design/WorkbenchBackground';
import { PageTransition } from '@/components/design/PageTransition';
import { cn } from '@/lib/utils';
import { LearningRail } from './LearningRail';
import { TopCompanionBar } from './TopCompanionBar';

interface AppShellProps {
  children: ReactNode;
  companion?: ReactNode;
  scene?: 'default' | 'companion' | 'galaxy' | 'storybook';
  immersive?: boolean;
}

/** Shared workbench chrome, with an immersive surface for focused tasks. */
export function AppShell({ children, companion, scene = 'default', immersive = false }: AppShellProps) {
  const location = useLocation();
  const [railExpanded, setRailExpanded] = useState(false);
  const railMode = railExpanded ? 'expanded' : 'compact';
  return (
    <div
      className="relative min-h-screen overflow-x-clip bg-[var(--em-canvas)] text-[var(--em-ink)]"
      data-ui-scene={scene}
      data-workspace-shell={immersive ? 'immersive' : 'responsive'}
    >
      {!immersive && <WorkbenchBackground />}
      {!immersive && <TopCompanionBar />}
      {!immersive && (
        <LearningRail
          currentPath={location.pathname}
          expanded={railExpanded}
          onExpandedChange={setRailExpanded}
        />
      )}
      <main
        data-workspace-content="true"
        data-workspace-rail-mode={!immersive ? railMode : undefined}
        className={cn(
          'relative z-10 min-w-0',
          immersive
            ? 'min-h-screen'
            : cn(
                'pb-[7.5rem] pt-14 md:pb-9 md:pl-16',
                railExpanded && 'md:pl-[200px]',
              ),
        )}
      >
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
