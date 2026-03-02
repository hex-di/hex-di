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
    component: ComponentCreator('/docs', '543'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'eba'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'e9a'),
            routes: [
              {
                path: '/docs/',
                component: ComponentCreator('/docs/', '56e'),
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
                path: '/docs/concepts/compensation',
                component: ComponentCreator('/docs/concepts/compensation', '5c2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/execution',
                component: ComponentCreator('/docs/concepts/execution', 'ae1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/sagas',
                component: ComponentCreator('/docs/concepts/sagas', '26d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/steps',
                component: ComponentCreator('/docs/concepts/steps', 'f27'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/guides/building-sagas',
                component: ComponentCreator('/docs/guides/building-sagas', '823'),
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
                path: '/docs/guides/persistence',
                component: ComponentCreator('/docs/guides/persistence', '8d1'),
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
