import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/404',
    component: ComponentCreator('/404', 'cfc'),
    exact: true
  },
  {
    path: '/blog',
    component: ComponentCreator('/blog', 'ae9'),
    exact: true
  },
  {
    path: '/blog/archive',
    component: ComponentCreator('/blog/archive', '182'),
    exact: true
  },
  {
    path: '/blog/authors',
    component: ComponentCreator('/blog/authors', '0b7'),
    exact: true
  },
  {
    path: '/blog/tags',
    component: ComponentCreator('/blog/tags', '287'),
    exact: true
  },
  {
    path: '/blog/tags/architecture',
    component: ComponentCreator('/blog/tags/architecture', '397'),
    exact: true
  },
  {
    path: '/blog/tags/di',
    component: ComponentCreator('/blog/tags/di', '209'),
    exact: true
  },
  {
    path: '/blog/welcome',
    component: ComponentCreator('/blog/welcome', 'ac7'),
    exact: true
  },
  {
    path: '/markdown-page',
    component: ComponentCreator('/markdown-page', '3d7'),
    exact: true
  },
  {
    path: '/presentations/',
    component: ComponentCreator('/presentations/', 'd4d'),
    exact: true
  },
  {
    path: '/search',
    component: ComponentCreator('/search', '822'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', 'cef'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '556'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '766'),
            routes: [
              {
                path: '/docs/',
                component: ComponentCreator('/docs/', '5c1'),
                exact: true
              },
              {
                path: '/docs/advanced/type-level-programming',
                component: ComponentCreator('/docs/advanced/type-level-programming', '4f5'),
                exact: true
              },
              {
                path: '/docs/api/',
                component: ComponentCreator('/docs/api/', 'a32'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api/core',
                component: ComponentCreator('/docs/api/core', '37a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api/graph',
                component: ComponentCreator('/docs/api/graph', 'b9e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api/graph-architecture',
                component: ComponentCreator('/docs/api/graph-architecture', 'f4c'),
                exact: true
              },
              {
                path: '/docs/api/react',
                component: ComponentCreator('/docs/api/react', '748'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api/result',
                component: ComponentCreator('/docs/api/result', '215'),
                exact: true
              },
              {
                path: '/docs/api/runtime',
                component: ComponentCreator('/docs/api/runtime', '3d1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api/testing',
                component: ComponentCreator('/docs/api/testing', 'd2c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/examples/',
                component: ComponentCreator('/docs/examples/', '439'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/',
                component: ComponentCreator('/docs/getting-started/', '954'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/core-concepts',
                component: ComponentCreator('/docs/getting-started/core-concepts', '8b4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/first-application',
                component: ComponentCreator('/docs/getting-started/first-application', '979'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/installation',
                component: ComponentCreator('/docs/getting-started/installation', '714'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/lifetimes',
                component: ComponentCreator('/docs/getting-started/lifetimes', '749'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/typescript-integration',
                component: ComponentCreator('/docs/getting-started/typescript-integration', 'e23'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/',
                component: ComponentCreator('/docs/guides/', '1ff'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/error-handling',
                component: ComponentCreator('/docs/guides/error-handling', '2a1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/react-integration',
                component: ComponentCreator('/docs/guides/react-integration', '65d'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/testing-strategies',
                component: ComponentCreator('/docs/guides/testing-strategies', '121'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/improvements',
                component: ComponentCreator('/docs/improvements', 'ff2'),
                exact: true
              },
              {
                path: '/docs/improvements/adapter',
                component: ComponentCreator('/docs/improvements/adapter', 'aa7'),
                exact: true
              },
              {
                path: '/docs/improvements/di-container-analysis',
                component: ComponentCreator('/docs/improvements/di-container-analysis', '25c'),
                exact: true
              },
              {
                path: '/docs/improvements/graph-builder',
                component: ComponentCreator('/docs/improvements/graph-builder', 'cb1'),
                exact: true
              },
              {
                path: '/docs/improvements/port',
                component: ComponentCreator('/docs/improvements/port', '9b7'),
                exact: true
              },
              {
                path: '/docs/improvements/react-runtime-integration-analysis',
                component: ComponentCreator('/docs/improvements/react-runtime-integration-analysis', 'a57'),
                exact: true
              },
              {
                path: '/docs/improvements/runtime-ai-ergonomics-analysis',
                component: ComponentCreator('/docs/improvements/runtime-ai-ergonomics-analysis', '932'),
                exact: true
              },
              {
                path: '/docs/improvements/runtime-package-improvement-spec',
                component: ComponentCreator('/docs/improvements/runtime-package-improvement-spec', '085'),
                exact: true
              },
              {
                path: '/docs/patterns/',
                component: ComponentCreator('/docs/patterns/', '079'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/patterns/composing-graphs',
                component: ComponentCreator('/docs/patterns/composing-graphs', 'caf'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/patterns/finalizers-and-cleanup',
                component: ComponentCreator('/docs/patterns/finalizers-and-cleanup', '5d4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/patterns/project-structure',
                component: ComponentCreator('/docs/patterns/project-structure', 'ae6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/patterns/scoped-services',
                component: ComponentCreator('/docs/patterns/scoped-services', '58e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/technical-improvements',
                component: ComponentCreator('/docs/technical-improvements', 'ec2'),
                exact: true
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
