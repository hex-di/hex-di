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
    component: ComponentCreator('/docs', 'd28'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'cad'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '600'),
            routes: [
              {
                path: '/docs/',
                component: ComponentCreator('/docs/', '56e'),
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
                path: '/docs/api/api-reference',
                component: ComponentCreator('/docs/api/api-reference', '9ba'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/error-patterns',
                component: ComponentCreator('/docs/concepts/error-patterns', '057'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/option-type',
                component: ComponentCreator('/docs/concepts/option-type', '532'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/concepts/result-type',
                component: ComponentCreator('/docs/concepts/result-type', '805'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/guides/async-results',
                component: ComponentCreator('/docs/guides/async-results', '4a1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/guides/generators',
                component: ComponentCreator('/docs/guides/generators', '1ee'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/guides/transformations',
                component: ComponentCreator('/docs/guides/transformations', 'aa4'),
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
