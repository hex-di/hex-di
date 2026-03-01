import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { LIBRARIES, getLibraryUrl } from "@hex-di/website-theme/libraries";

interface PostCssOptions {
  plugins: unknown[];
  [key: string]: unknown;
}

function tailwindPlugin() {
  return {
    name: "docusaurus-tailwindcss",
    configurePostCss(postcssOptions: PostCssOptions): PostCssOptions {
      postcssOptions.plugins.push(require("@tailwindcss/postcss"));
      postcssOptions.plugins.push(require("autoprefixer"));
      return postcssOptions;
    },
  };
}

const librariesDropdown = {
  type: "dropdown" as const,
  label: "Libraries",
  position: "left" as const,
  items: LIBRARIES.filter(lib => lib.id !== "core").map(lib => ({
    label: lib.name,
    href: getLibraryUrl(lib),
  })),
};

const config: Config = {
  title: "HexDI",
  tagline: "Type-Safe Dependency Injection for TypeScript",
  favicon: "img/favicon.ico",

  future: { v4: true },
  markdown: { format: "detect" },

  url: "https://hexdi.dev",
  baseUrl: "/",

  organizationName: "leaderiop",
  projectName: "hex-di",

  plugins: [tailwindPlugin],

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: { defaultLocale: "en", locales: ["en"] },

  headTags: [
    {
      tagName: "meta",
      attributes: {
        name: "description",
        content:
          "HexDI is a type-safe dependency injection framework for TypeScript. Catch dependency errors at compile time with full type inference and zero runtime overhead.",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "keywords",
        content:
          "dependency injection, TypeScript, type-safe, DI, IoC, inversion of control, hexagonal architecture, ports and adapters, React DI, compile-time validation",
      },
    },
    {
      tagName: "meta",
      attributes: { name: "author", content: "HexDI Contributors" },
    },
    {
      tagName: "meta",
      attributes: { name: "robots", content: "index, follow" },
    },
    {
      tagName: "meta",
      attributes: { name: "theme-color", content: "#020408" },
    },
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          path: "../../docs",
          sidebarPath: "./sidebars.ts",
          routeBasePath: "docs",
          editUrl: "https://github.com/leaderiop/hex-di/tree/main/docs/",
        },
        blog: {
          path: "blog",
          routeBasePath: "blog",
          showReadingTime: true,
          feedOptions: {
            type: ["rss", "atom"],
            title: "HexDI Blog",
            description: "Engineering updates, tutorials, and release notes from the HexDI team",
            copyright: `Copyright ${new Date().getFullYear()} HexDI Contributors`,
          },
          blogTitle: "HexDI Blog",
          blogDescription: "Engineering updates, tutorials, and release notes from the HexDI team",
          blogSidebarCount: "ALL",
          blogSidebarTitle: "All Posts",
          editUrl: "https://github.com/leaderiop/hex-di/tree/main/websites/core/",
          tags: "tags.yml",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
        sitemap: {
          lastmod: "date",
          changefreq: "weekly",
          priority: 0.5,
          ignorePatterns: ["/tags/**"],
          filename: "sitemap.xml",
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        language: ["en"],
        indexDocs: true,
        indexPages: true,
        indexBlog: true,
        blogRouteBasePath: "/blog",
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        docsRouteBasePath: "/docs",
        searchBarShortcut: true,
        searchBarShortcutHint: true,
        searchBarPosition: "right",
        searchResultLimits: 8,
        searchResultContextMaxLength: 50,
        removeDefaultStopWordFilter: false,
        removeDefaultStemmer: false,
      },
    ],
  ],

  themeConfig: {
    image: "img/hexdi-social-card.png",

    metadata: [
      { name: "og:type", content: "website" },
      { name: "og:site_name", content: "HexDI" },
      {
        name: "og:title",
        content: "HexDI - Type-Safe Dependency Injection for TypeScript",
      },
      {
        name: "og:description",
        content:
          "Catch dependency errors at compile time, not runtime. Build robust TypeScript applications with full type inference and zero runtime overhead.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "HexDI - Type-Safe Dependency Injection for TypeScript",
      },
      {
        name: "twitter:description",
        content:
          "Catch dependency errors at compile time, not runtime. Build robust TypeScript applications with full type inference and zero runtime overhead.",
      },
    ],

    colorMode: {
      defaultMode: "dark",
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },

    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },

    navbar: {
      title: "HexDI",
      logo: { alt: "HexDI Logo", src: "img/logo.svg", width: 40, height: 40 },
      hideOnScroll: false,
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Docs",
        },
        { to: "/docs/api", position: "left", label: "API" },
        { to: "/docs/examples", position: "left", label: "Examples" },
        librariesDropdown,
        { to: "/blog", position: "left", label: "Blog" },
        { to: "/presentations", position: "left", label: "Presentations" },
        { type: "search", position: "right" },
        {
          href: "https://github.com/leaderiop/hex-di",
          position: "right",
          className: "header-github-link",
          "aria-label": "GitHub repository",
        },
      ],
    },

    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            { label: "Getting Started", to: "/docs/getting-started" },
            { label: "API Reference", to: "/docs/api" },
            { label: "Guides", to: "/docs/guides" },
            { label: "Examples", to: "/docs/examples" },
          ],
        },
        {
          title: "Ecosystem",
          items: LIBRARIES.filter(lib => lib.id !== "core")
            .slice(0, 6)
            .map(lib => ({
              label: lib.name,
              href: getLibraryUrl(lib),
            })),
        },
        {
          title: "Community",
          items: [
            { label: "GitHub", href: "https://github.com/leaderiop/hex-di" },
            { label: "Discussions", href: "https://github.com/leaderiop/hex-di/discussions" },
            { label: "Blog", to: "/blog" },
          ],
        },
        {
          title: "Legal",
          items: [
            { label: "License", href: "https://github.com/leaderiop/hex-di/blob/main/LICENSE" },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} HexDI Contributors. MIT License.`,
    },

    prism: {
      theme: prismThemes.dracula,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "typescript", "tsx", "jsx", "diff", "shell-session"],
      magicComments: [
        {
          className: "theme-code-block-highlighted-line",
          line: "highlight-next-line",
          block: { start: "highlight-start", end: "highlight-end" },
        },
        {
          className: "code-block-error-line",
          line: "error-line",
          block: { start: "error-start", end: "error-end" },
        },
        {
          className: "code-block-success-line",
          line: "success-line",
          block: { start: "success-start", end: "success-end" },
        },
      ],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
