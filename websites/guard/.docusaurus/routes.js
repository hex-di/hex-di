import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/blog',
    component: ComponentCreator('/blog', '5b4'),
    exact: true
  },
  {
    path: '/blog/2026/02/27/welcome',
    component: ComponentCreator('/blog/2026/02/27/welcome', 'cef'),
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
    path: '/blog/tags/announcement',
    component: ComponentCreator('/blog/tags/announcement', 'f63'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '920'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'a8b'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'a6f'),
            routes: [
              {
                path: '/docs/',
                component: ComponentCreator('/docs/', '56e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/advanced/architecture',
                component: ComponentCreator('/docs/advanced/architecture', 'cd8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/advanced/gxp',
                component: ComponentCreator('/docs/advanced/gxp', 'eb4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/api/api-reference',
                component: ComponentCreator('/docs/api/api-reference', '9ba'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/evaluation',
                component: ComponentCreator('/docs/concepts/evaluation', '8ac'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/permissions',
                component: ComponentCreator('/docs/concepts/permissions', '8e9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/policies',
                component: ComponentCreator('/docs/concepts/policies', 'ce8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/roles',
                component: ComponentCreator('/docs/concepts/roles', '92a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/subjects',
                component: ComponentCreator('/docs/concepts/subjects', '577'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/guides/di-integration',
                component: ComponentCreator('/docs/guides/di-integration', 'fb7'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/guides/port-gates',
                component: ComponentCreator('/docs/guides/port-gates', 'b41'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/guides/serialization',
                component: ComponentCreator('/docs/guides/serialization', 'ada'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/react',
                component: ComponentCreator('/docs/react', '7e1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/testing',
                component: ComponentCreator('/docs/testing', 'c39'),
                exact: true,
                sidebar: "docs"
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
