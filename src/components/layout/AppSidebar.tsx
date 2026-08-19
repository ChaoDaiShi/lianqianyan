import {
  Home,
  Bot,
  GraduationCap,
  LayoutGrid,
  BookOpen,
  Stethoscope,
  Hammer,
  FolderOpen,
  Settings,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

/** 主工作台导航。 */
export const mainNav: NavItem[] = [
  { label: '学习首页', to: '/', icon: Home },
  { label: '小涟', to: '/xiaolian', icon: Bot },
  { label: '我的学习', to: '/my-learning', icon: GraduationCap },
  { label: '学习空间', to: '/space', icon: LayoutGrid },
  { label: '知识世界', to: '/knowledge', icon: BookOpen },
  { label: '学习诊断', to: '/diagnosis', icon: Stethoscope },
  { label: '资源工坊', to: '/resources', icon: Hammer },
  { label: '学习档案', to: '/archive', icon: FolderOpen },
];

/** 底部次导航。 */
export const bottomNav: NavItem[] = [
  { label: '设置', to: '/settings', icon: Settings },
  { label: '关于 EducationMind', to: '/about', icon: Info },
];

interface AppSidebarProps {
  currentPath?: string;
}

/**
 * 左侧教育工作台导航。
 */
export function AppSidebar({ currentPath }: AppSidebarProps) {
  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/'}
        className={() =>
          cn(
            'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            currentPath === item.to
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              className={cn(
                'h-[18px] w-[18px]',
                isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
              )}
            />
            <span className="truncate">{item.label}</span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-100 bg-white md:flex">
      {/* 品牌区 */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-gray-900">忆涟千言—教</p>
          <p className="text-xs text-gray-400">EducationMind</p>
        </div>
      </div>

      {/* 主导航 */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {mainNav.map(renderItem)}
      </nav>

      {/* 底部导航 */}
      <nav className="space-y-1 border-t border-gray-100 px-3 py-3">
        {bottomNav.map(renderItem)}
      </nav>
    </aside>
  );
}
