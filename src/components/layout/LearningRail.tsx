import { BookOpen, FolderOpen, GraduationCap, Home, Stethoscope, WandSparkles, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface RailItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const learningRailItems: RailItem[] = [
  { label: '首页', to: '/', icon: Home },
  { label: '我的学习', to: '/my-learning', icon: GraduationCap },
  { label: '学习诊断', to: '/diagnosis', icon: Stethoscope },
  { label: '知识空间', to: '/knowledge', icon: BookOpen },
  { label: '学习工坊', to: '/resources', icon: WandSparkles },
  { label: '学习档案', to: '/archive', icon: FolderOpen },
];

function RailLink({ item, currentPath }: { item: RailItem; currentPath?: string }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={item.label}
      className={({ isActive }) => cn(
        'group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[9px] font-semibold transition duration-200 sm:text-[10px] md:flex-none md:px-2 md:py-3 md:text-[10px]',
        isActive || currentPath === item.to
          ? 'bg-white text-primary-700 shadow-[0_10px_30px_rgba(139,124,246,0.18)]'
          : 'text-[var(--em-muted-ink)] hover:bg-white/60 hover:text-primary-700'
      )}
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-5 w-5', (isActive || currentPath === item.to) && 'text-primary-500')} />
          <span className="whitespace-nowrap">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function LearningRail({ currentPath }: { currentPath?: string }) {
  return (
    <>
      <nav aria-label="学习星轨" className="em-glass fixed bottom-0 left-0 right-0 z-40 grid w-full grid-cols-6 items-center gap-1 rounded-t-[28px] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:bottom-auto md:left-3 md:right-auto md:top-1/2 md:w-[76px] md:-translate-y-1/2 md:flex md:flex-col md:rounded-[28px] md:px-2 md:py-3">
        {learningRailItems.map((item) => <RailLink key={item.to} item={item} currentPath={currentPath} />)}
      </nav>
    </>
  );
}
