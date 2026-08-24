import type { RouteObject } from 'react-router-dom';

export const lazyRoutes: RouteObject[] = [
  {
    path: '/showcase',
    lazy: () =>
      import('@/pages/ShowcasePage').then((module) => ({
        Component: module.ShowcasePage,
      })),
  },
  {
    path: '/demo',
    lazy: () =>
      import('@/pages/DemoPage').then((module) => ({
        Component: module.DemoPage,
      })),
  },
  {
    path: '/xiaolian',
    lazy: () =>
      import('@/pages/XiaolianPage').then((module) => ({
        Component: module.XiaolianPage,
      })),
  },
  {
    path: '/my-learning',
    lazy: () =>
      import('@/pages/MyLearningPage').then((module) => ({
        Component: module.MyLearningPage,
      })),
  },
  {
    path: '/space',
    lazy: () =>
      import('@/pages/LearningSpacePage').then((module) => ({
        Component: module.LearningSpacePage,
      })),
  },
  {
    path: '/reflection',
    lazy: () =>
      import('@/pages/ReflectionPage').then((module) => ({
        Component: module.ReflectionPage,
      })),
  },
  {
    path: '/knowledge',
    lazy: () =>
      import('@/pages/KnowledgePage').then((module) => ({
        Component: module.KnowledgePage,
      })),
  },
  {
    path: '/diagnosis',
    lazy: () =>
      import('@/pages/DiagnosisPage').then((module) => ({
        Component: module.default,
      })),
  },
  {
    path: '/resources',
    lazy: () =>
      import('@/pages/PlaceholderPages').then((module) => ({
        Component: module.ResourcesPage,
      })),
  },
  {
    path: '/archive',
    lazy: () =>
      import('@/pages/ArchivePage').then((module) => ({
        Component: module.ArchivePage,
      })),
  },
  {
    path: '/settings',
    lazy: () =>
      import('@/pages/PlaceholderPages').then((module) => ({
        Component: module.SettingsPage,
      })),
  },
  {
    path: '/about',
    lazy: () =>
      import('@/pages/PlaceholderPages').then((module) => ({
        Component: module.AboutPage,
      })),
  },
  {
    path: '/about/capabilities',
    lazy: () =>
      import('@/pages/CapabilityPage').then((module) => ({
        Component: module.CapabilityPage,
      })),
  },
  {
    path: '*',
    lazy: () =>
      import('@/pages/NotFound').then((module) => ({
        Component: module.default,
      })),
  },
];
