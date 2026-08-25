import { createHashRouter, Outlet } from 'react-router-dom';
import Home from '@/pages/Home';
import { lazyRoutes } from './routeManifest';

function RouteLoadingFallback() {
  return (
    <div
      role="status"
      className="grid min-h-screen place-items-center bg-[var(--em-canvas)] text-sm font-medium text-primary-700"
    >
      正在进入学习空间…
    </div>
  );
}

/**
 * 忆涟千言—教 EducationMind —— Hash 路由。
 * URLs 形如 /#/…，无需服务器重写规则。
 */
export const router = createHashRouter([
  {
    path: '/',
    element: <Outlet />,
    hydrateFallbackElement: <RouteLoadingFallback />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      ...lazyRoutes,
    ],
  },
]);
