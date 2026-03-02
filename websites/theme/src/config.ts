import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type { Options as PresetOptions } from "@docusaurus/preset-classic";
import { LIBRARIES, getLibraryUrl } from "./libraries";

export interface SiteOptions {
  readonly libraryId: string;
  readonly docsPath: string;
  readonly blogPath?: string;
  readonly customCss: string;
  readonly editBaseUrl?: string;
  readonly additionalNavItems?: ReadonlyArray<{
    readonly label: string;
    readonly to?: string;
    readonly href?: string;
    readonly position?: "left" | "right";
  }>;
  readonly tailwindPlugin?: () => {
    name: string;
    configurePostCss: (opts: Record<string, unknown>) => Record<string, unknown>;
  };
  readonly additionalPlugins?: ReadonlyArray<unknown>;
}

function buildLibrariesDropdown(): {
  label: string;
  position: "left";
  items: Array<{ label: string; href: string }>;
  type: "dropdown";
} {
  return {
    type: "dropdown",
    label: "Libraries",
    position: "left",
    items: LIBRARIES.map(lib => ({
      label: lib.id === "core" ? `HexDI (Core)` : lib.name,
      href: getLibraryUrl(lib),
    })),
  };
}

export function createSiteConfig(options: SiteOptions): Config {
  const library = LIBRARIES.find(lib => lib.id === options.libraryId);
  if (!library) {
    throw new Error(
      `Unknown library: ${options.libraryId}. Valid: ${LIBRARIES.map(l => l.id).join(", ")}`
    );
  }

  const isCore = library.id === "core";
  const url = isCore ? "https://hexdi.dev" : `https://${library.subdomain}.hexdi.dev`;
  const baseUrl = "/";
  const editUrl = options.editBaseUrl ?? `https://github.com/leaderiop/hex-di/tree/main/`;

  const navItems: Array<Record<string, unknown>> = [
    { type: "docSidebar", sidebarId: "docs", label: "Docs", position: "left" },
    ...(options.additionalNavItems ?? []),
    buildLibrariesDropdown(),
    { to: "/blog", label: "Blog", position: "left" },
    { href: "https://github.com/leaderiop/hex-di", label: "GitHub", position: "right" },
  ];

  const plugins: Array<unknown> = [];
  if (options.tailwindPlugin) {
    plugins.push(options.tailwindPlugin);
  }
  if (options.additionalPlugins) {
    plugins.push(...options.additionalPlugins);
  }

  return {
    title: library.name,
    tagline: library.tagline,
    favicon: "img/favicon.ico",

    future: { v4: true },

    themes: ["@docusaurus/theme-mermaid"],

    markdown: { format: "detect", mermaid: true },

    url,
    baseUrl,

    organizationName: "leaderiop",
    projectName: "hex-di",

    onBrokenLinks: "warn",
    onBrokenMarkdownLinks: "warn",

    i18n: { defaultLocale: "en", locales: ["en"] },

    plugins,

    presets: [
      [
        "classic",
        {
          docs: {
            path: options.docsPath,
            routeBasePath: "docs",
            sidebarPath: "./sidebars.ts",
            editUrl,
          },
          blog:
            options.blogPath !== undefined
              ? {
                  path: options.blogPath,
                  routeBasePath: "blog",
                  blogTitle: `${library.name} Blog`,
                  blogDescription: `Updates, tutorials, and insights about ${library.name}.`,
                  showReadingTime: true,
                  feedOptions: { type: ["rss", "atom"], xslt: true },
                  blogSidebarCount: "ALL",
                  blogSidebarTitle: "All Posts",
                }
              : false,
          theme: {
            customCss: options.customCss,
          },
        } satisfies PresetOptions,
      ],
    ],

    themeConfig: {
      colorMode: {
        defaultMode: "dark",
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: library.name,
        logo: { alt: `${library.name} Logo`, src: "img/logo.svg" },
        items: navItems,
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [{ label: "Getting Started", to: "/docs" }],
          },
          {
            title: "Ecosystem",
            items: LIBRARIES.filter(l => l.id !== library.id)
              .slice(0, 4)
              .map(l => ({
                label: l.name,
                href: getLibraryUrl(l),
              })),
          },
          {
            title: "Community",
            items: [
              { label: "GitHub", href: "https://github.com/leaderiop/hex-di" },
              { label: "Blog", to: "/blog" },
            ],
          },
        ],
        copyright: `Copyright \u00A9 ${new Date().getFullYear()} HexDI Contributors.`,
      },
      mermaid: {
        theme: { dark: "dark" },
      },
      prism: {
        theme: prismThemes.dracula,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ["bash", "json", "typescript"],
        magicComments: [
          {
            className: "theme-code-block-highlighted-line",
            line: "highlight-next-line",
            block: { start: "highlight-start", end: "highlight-end" },
          },
          { className: "code-block-error-line", line: "error-next-line" },
        ],
      },
      metadata: [
        { name: "keywords", content: `${library.name}, TypeScript, hex-di, type-safe` },
        { name: "author", content: "HexDI Contributors" },
      ],
    },
  };
}
