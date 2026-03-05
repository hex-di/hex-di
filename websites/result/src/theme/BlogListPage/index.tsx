import type { ReactNode } from "react";
import { useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import BlogListPageStructuredData from "@theme/BlogListPage/StructuredData";
import type { Props } from "@theme/BlogListPage";

// ============================================================
// CONSTANTS
// ============================================================

const ACCENT = "#A6E22E";
const MONO = "'Fira Code', monospace";
const SLATE_400 = "rgba(148, 163, 184, 1)";
const SLATE_500 = "rgba(100, 116, 139, 1)";
const SLATE_800 = "rgba(30, 41, 59, 1)";
const SURFACE_BG = "rgba(15, 23, 42, 0.5)";
const DARK_BG = "rgba(2, 4, 8, 0.9)";
const DARK_BG_LIGHT = "rgba(2, 4, 8, 0.4)";

// ============================================================
// HELPERS
// ============================================================

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function extractTagsWithCounts(
  items: Props["items"]
): Array<{ label: string; permalink: string; count: number }> {
  const tagMap = new Map<string, { label: string; permalink: string; count: number }>();
  for (const { content } of items) {
    for (const tag of content.metadata.tags) {
      const existing = tagMap.get(tag.label);
      if (existing) {
        existing.count++;
      } else {
        tagMap.set(tag.label, { label: tag.label, permalink: tag.permalink, count: 1 });
      }
    }
  }
  return [...tagMap.values()].sort((a, b) => b.count - a.count);
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function TagPill({
  label,
  permalink,
}: {
  readonly label: string;
  readonly permalink: string;
}): ReactNode {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={permalink}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        background: hovered ? "rgba(166, 226, 46, 0.15)" : "rgba(166, 226, 46, 0.1)",
        color: ACCENT,
        fontFamily: MONO,
        fontSize: "0.7rem",
        textDecoration: "none",
        transition: "background 0.2s",
      }}
    >
      {label}
    </a>
  );
}

function ReadMoreLink({ permalink }: { readonly permalink: string }): ReactNode {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={permalink}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: MONO,
        fontSize: "0.8rem",
        fontWeight: 700,
        color: ACCENT,
        textDecoration: "none",
        opacity: hovered ? 1 : 0.85,
        transition: "opacity 0.2s",
      }}
    >
      Read more &rarr;
    </a>
  );
}

function FeaturedPostCard({ item }: { readonly item: Props["items"][number] }): ReactNode {
  const { metadata } = item.content;
  const [hovered, setHovered] = useState(false);
  const firstTag = metadata.tags[0];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        minHeight: "400px",
        borderRadius: "12px",
        border: `1px solid ${hovered ? "rgba(166, 226, 46, 0.6)" : "rgba(166, 226, 46, 0.4)"}`,
        background: `linear-gradient(135deg, ${DARK_BG} 0%, ${DARK_BG_LIGHT} 100%)`,
        padding: "48px 40px",
        marginBottom: "32px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        transition: "border-color 0.3s",
        overflow: "hidden",
      }}
    >
      {/* FEATURED badge */}
      <div
        style={{
          position: "absolute",
          top: "24px",
          left: "24px",
          padding: "4px 12px",
          background: "rgba(166, 226, 46, 0.15)",
          border: "1px solid rgba(166, 226, 46, 0.3)",
          borderRadius: "4px",
          fontFamily: MONO,
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: ACCENT,
        }}
      >
        FEATURED
      </div>

      {/* Tags + date row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        {firstTag && <TagPill label={firstTag.label} permalink={firstTag.permalink} />}
        <span
          style={{
            fontFamily: MONO,
            fontSize: "0.7rem",
            color: SLATE_500,
          }}
        >
          {formatDate(metadata.date)}
        </span>
      </div>

      {/* Title */}
      <a
        href={metadata.permalink}
        style={{
          textDecoration: "none",
          display: "block",
          marginBottom: "12px",
        }}
      >
        <h2
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "1.85rem",
            fontWeight: 700,
            color: hovered ? ACCENT : "#FFFFFF",
            margin: 0,
            lineHeight: 1.3,
            transition: "color 0.2s",
            letterSpacing: "-0.01em",
            textTransform: "none",
          }}
        >
          {metadata.title}
        </h2>
      </a>

      {/* Description */}
      {metadata.description && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.95rem",
            color: SLATE_400,
            lineHeight: 1.6,
            margin: "0 0 20px 0",
            maxWidth: "600px",
          }}
        >
          {metadata.description}
        </p>
      )}

      <ReadMoreLink permalink={metadata.permalink} />
    </div>
  );
}

function PostCard({ item }: { readonly item: Props["items"][number] }): ReactNode {
  const { metadata } = item.content;
  const [hovered, setHovered] = useState(false);
  const firstTag = metadata.tags[0];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid ${hovered ? "rgba(166, 226, 46, 0.5)" : SLATE_800}`,
        background: SURFACE_BG,
        backdropFilter: "blur(4px)",
        borderRadius: "8px",
        padding: "24px",
        transition: "border-color 0.3s",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Tag + date */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        {firstTag && <TagPill label={firstTag.label} permalink={firstTag.permalink} />}
        <span
          style={{
            fontFamily: MONO,
            fontSize: "0.7rem",
            color: SLATE_500,
          }}
        >
          {formatDate(metadata.date)}
        </span>
      </div>

      {/* Title */}
      <a
        href={metadata.permalink}
        style={{ textDecoration: "none", display: "block", marginBottom: "8px" }}
      >
        <h3
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "1.15rem",
            fontWeight: 700,
            color: hovered ? ACCENT : "#FFFFFF",
            margin: 0,
            lineHeight: 1.35,
            transition: "color 0.2s",
            letterSpacing: "-0.01em",
            textTransform: "none",
          }}
        >
          {metadata.title}
        </h3>
      </a>

      {/* Description */}
      {metadata.description && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.85rem",
            color: SLATE_400,
            lineHeight: 1.55,
            margin: "0 0 16px 0",
            flex: 1,
          }}
        >
          {metadata.description}
        </p>
      )}

      <ReadMoreLink permalink={metadata.permalink} />
    </div>
  );
}

function PostGrid({ items }: { readonly items: Props["items"] }): ReactNode {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "24px",
        marginBottom: "40px",
      }}
      className="result-blog-grid"
    >
      {items.map(item => (
        <PostCard key={item.content.metadata.permalink} item={item} />
      ))}
    </div>
  );
}

function Sidebar({
  sidebar,
  items,
}: {
  readonly sidebar: Props["sidebar"];
  readonly items: Props["items"];
}): ReactNode {
  const tags = extractTagsWithCounts(items);

  return (
    <aside
      className="result-blog-sidebar"
      style={{
        width: "256px",
        flexShrink: 0,
        paddingRight: "32px",
      }}
    >
      {/* Recent Posts */}
      <div style={{ marginBottom: "32px" }}>
        <h4
          style={{
            fontFamily: MONO,
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "rgba(166, 226, 46, 0.7)",
            marginBottom: "16px",
          }}
        >
          Recent Posts
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {sidebar.items.map(sidebarItem => (
            <SidebarLink key={sidebarItem.permalink} item={sidebarItem} />
          ))}
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <h4
            style={{
              fontFamily: MONO,
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "rgba(166, 226, 46, 0.7)",
              marginBottom: "16px",
            }}
          >
            Tags
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {tags.map(tag => (
              <SidebarTag key={tag.label} tag={tag} />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function SidebarLink({
  item,
}: {
  readonly item: { readonly title: string; readonly permalink: string; readonly date: string };
}): ReactNode {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={item.permalink}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textDecoration: "none",
        display: "block",
      }}
    >
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.82rem",
          color: hovered ? ACCENT : SLATE_400,
          lineHeight: 1.4,
          transition: "color 0.2s",
        }}
      >
        {item.title}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.65rem",
          color: SLATE_500,
          marginTop: "2px",
        }}
      >
        {formatDate(item.date)}
      </div>
    </a>
  );
}

function SidebarTag({
  tag,
}: {
  readonly tag: { readonly label: string; readonly permalink: string; readonly count: number };
}): ReactNode {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={tag.permalink}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 10px",
        borderRadius: "4px",
        background: hovered ? "rgba(166, 226, 46, 0.15)" : "rgba(166, 226, 46, 0.08)",
        color: hovered ? ACCENT : SLATE_400,
        fontFamily: MONO,
        fontSize: "0.7rem",
        textDecoration: "none",
        transition: "all 0.2s",
      }}
    >
      {tag.label}
      <span style={{ color: SLATE_500, fontSize: "0.6rem" }}>({tag.count})</span>
    </a>
  );
}

function Pagination({ metadata }: { readonly metadata: Props["metadata"] }): ReactNode {
  const { page, totalPages, blogTitle } = metadata;
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  function pageUrl(p: number): string {
    if (p === 1) return "/blog";
    return `/blog/page/${p}`;
  }

  return (
    <nav
      aria-label={`${blogTitle} pagination`}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px",
        marginTop: "16px",
        marginBottom: "40px",
      }}
    >
      {/* Prev */}
      {page > 1 && <PaginationButton href={pageUrl(page - 1)} label="<" active={false} />}

      {pages.map(p => (
        <PaginationButton key={p} href={pageUrl(p)} label={String(p)} active={p === page} />
      ))}

      {/* Next */}
      {page < totalPages && <PaginationButton href={pageUrl(page + 1)} label=">" active={false} />}
    </nav>
  );
}

function PaginationButton({
  href,
  label,
  active,
}: {
  readonly href: string;
  readonly label: string;
  readonly active: boolean;
}): ReactNode {
  const [hovered, setHovered] = useState(false);

  const isActive = active;
  const borderColor = isActive ? ACCENT : hovered ? "rgba(166, 226, 46, 0.5)" : SLATE_800;
  const bg = isActive ? "rgba(166, 226, 46, 0.15)" : "transparent";
  const color = isActive ? ACCENT : hovered ? ACCENT : SLATE_400;

  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "40px",
        height: "40px",
        borderRadius: "6px",
        border: `1px solid ${borderColor}`,
        background: bg,
        color,
        fontFamily: MONO,
        fontSize: "0.8rem",
        fontWeight: isActive ? 700 : 400,
        textDecoration: "none",
        transition: "all 0.2s",
      }}
    >
      {label}
    </a>
  );
}

// ============================================================
// METADATA
// ============================================================

function BlogListPageMetadata({ metadata }: Props): ReactNode {
  const {
    siteConfig: { title: siteTitle },
  } = useDocusaurusContext();
  const { blogDescription, blogTitle, permalink } = metadata;
  const isBlogOnlyMode = permalink === "/";
  const title = isBlogOnlyMode ? siteTitle : blogTitle;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={blogDescription} />
      <meta name="robots" content="index, follow" />
    </Head>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function BlogListPage(props: Props): ReactNode {
  const { metadata, items, sidebar } = props;
  const [featured, ...rest] = items;

  return (
    <>
      <BlogListPageMetadata {...props} />
      <BlogListPageStructuredData {...props} />
      <Layout>
        {/* Inline responsive styles */}
        <style>{`
          .result-blog-sidebar {
            display: block;
          }
          @media (max-width: 768px) {
            .result-blog-sidebar {
              display: none !important;
            }
            .result-blog-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "40px 24px",
            display: "flex",
            gap: "40px",
          }}
        >
          {/* Sidebar */}
          <Sidebar sidebar={sidebar} items={items} />

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Featured post */}
            {featured && <FeaturedPostCard item={featured} />}

            {/* Post grid */}
            {rest.length > 0 && <PostGrid items={rest} />}

            {/* Pagination */}
            <Pagination metadata={metadata} />
          </div>
        </div>
      </Layout>
    </>
  );
}
