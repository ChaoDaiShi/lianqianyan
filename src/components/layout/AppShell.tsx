import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { XiaolianAssistant } from '@/components/xiaolian/XiaolianAssistant';

interface AppShellProps {
  children: ReactNode;
}

/**
 * 教育 Workspace 布局外壳：
 * 左侧工作台导航 + 右侧内容区 + 全局小涟悬浮入口。
 */
export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  return (
    <div className="flex min-h-screen bg-[#fafbfc] text-gray-900">
      <AppSidebar currentPath={location.pathname} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
      <XiaolianAssistant />
    </div>
  );
}
