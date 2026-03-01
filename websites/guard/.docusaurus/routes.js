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
    component: ComponentCreator('/docs', 'f67'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '2b0'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '355'),
            routes: [
              {
                path: '/docs/',
                component: ComponentCreator('/docs/', '56e'),
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
