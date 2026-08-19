import { createHashRouter } from 'react-router-dom';
import Home from '@/pages/Home';
import NotFound from '@/pages/NotFound';
import DiagnosisPage from '@/pages/DiagnosisPage';
import { XiaolianPage } from '@/pages/XiaolianPage';
import { LearningSpacePage } from '@/pages/LearningSpacePage';
import { MyLearningPage } from '@/pages/MyLearningPage';
import { ArchivePage } from '@/pages/ArchivePage';
import {
  KnowledgePage,
  ResourcesPage,
  SettingsPage,
  AboutPage,
} from '@/pages/PlaceholderPages';

/**
 * 忆涟千言—教 EducationMind —— Hash 路由。
 * URLs 形如 /#/…，无需服务器重写规则。
 */
export const router = createHashRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/xiaolian',
    element: <XiaolianPage />,
  },
  {
    path: '/my-learning',
    element: <MyLearningPage />,
  },
  {
    path: '/space',
    element: <LearningSpacePage />,
  },
  {
    path: '/knowledge',
    element: <KnowledgePage />,
  },
  {
    path: '/diagnosis',
    element: <DiagnosisPage />,
  },
  {
    path: '/resources',
    element: <ResourcesPage />,
  },
  {
    path: '/archive',
    element: <ArchivePage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
