import { createHashRouter } from 'react-router-dom';
import Home from '@/pages/Home';
import { lazyRoutes } from './routeManifest';

/**
 * 忆涟千言—教 EducationMind —— Hash 路由。
 * URLs 形如 /#/…，无需服务器重写规则。
 */
export const router = createHashRouter([
  {
    path: '/',
    element: <Home />,
  },
  ...lazyRoutes,
]);
