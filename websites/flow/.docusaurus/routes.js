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
    component: ComponentCreator('/docs', 'f56'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '85b'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'b90'),
            routes: [
              {
                path: '/docs/',
                component: ComponentCreator('/docs/', '56e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/advanced/patterns',
                component: ComponentCreator('/docs/advanced/patterns', 'ffd'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/advanced/serialization',
                component: ComponentCreator('/docs/advanced/serialization', '465'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/advanced/tracing',
                component: ComponentCreator('/docs/advanced/tracing', '92c'),
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
                path: '/docs/concepts/activities',
                component: ComponentCreator('/docs/concepts/activities', 'ebe'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/effects',
                component: ComponentCreator('/docs/concepts/effects', '7b1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/states-events',
                component: ComponentCreator('/docs/concepts/states-events', 'd15'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/transitions',
                component: ComponentCreator('/docs/concepts/transitions', 'ee7'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/guides/building-machines',
                component: ComponentCreator('/docs/guides/building-machines', 'db7'),
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
                path: '/docs/guides/running-machines',
                component: ComponentCreator('/docs/guides/running-machines', 'b6b'),
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
