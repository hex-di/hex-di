import type { ReactNode } from "react";
import { useState } from "react";
import clsx from "clsx";
import { HtmlClassNameProvider, ThemeClassNames } from "@docusaurus/theme-common";
import { BlogPostProvider, useBlogPost } from "@docusaurus/plugin-content-blog/client";
import Layout from "@theme/Layout";
import MDXContent from "@theme/MDXContent";
import BlogPostPageMetadata from "@theme/BlogPostPage/Metadata";
import BlogPostPageStructuredData from "@theme/BlogPostPage/StructuredData";
import type { Props } from "@theme/BlogPostPage";

// ============================================================
// CONSTANTS (shared with BlogListPage)
// ============================================================

const ACCENT = "#A6E22E";
const MONO = "'Fira Code', monospace";
const SLATE_400 = "rgba(148, 163, 184, 1)";
const SLATE_500 = "rgba(100, 116, 139, 1)";
const SLATE_800 = "rgba(30, 41, 59, 1)";
const SURFACE_BG = "rgba(15, 23, 42, 0.5)";

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

function BackLink(): ReactNode {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="/blog"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-block",
        fontFamily: MONO,
        fontSize: "0.8rem",
        color: ACCENT,
        textDecoration: hovered ? "underline" : "none",
        marginBottom: "20px",
        transition: "text-decoration 0.2s",
      }}
    >
      &larr; Back to Blog
    </a>
  );
}

function HeroHeader(): ReactNode {
  const { metadata } = useBlogPost();
  const { title, date, readingTime, authors, tags } = metadata;

  const authorNames = authors
    .map(a => a.name)
    .filter(Boolean)
    .join(", ");

  const metaParts: string[] = [];
  if (authorNames) metaParts.push(authorNames);
  metaParts.push(formatDate(date));
  if (readingTime !== undefined) {
    metaParts.push(`${Math.ceil(readingTime)} min read`);
  }

  return (
    <header
      style={{
        padding: "48px 0 32px",
        borderBottom: "1px solid rgba(166, 226, 46, 0.15)",
        marginBottom: "40px",
      }}
    >
      <BackLink />

      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
          {tags.map(tag => (
            <TagPill key={tag.label} label={tag.label} permalink={tag.permalink} />
          ))}
        </div>
      )}

      <h1
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "2.2rem",
          fontWeight: 800,
          color: "#FFFFFF",
          margin: "0 0 12px 0",
          lineHeight: 1.25,
          letterSpacing: "-0.02em",
          textTransform: "none",
        }}
      >
        {title}
      </h1>

      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.8rem",
          color: SLATE_400,
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
        }}
      >
        {metaParts.map((part, i) => (
          <span key={i}>
            {i > 0 && <span style={{ margin: "0 4px", color: SLATE_500 }}>&middot;</span>}
            {part}
          </span>
        ))}
      </div>
    </header>
  );
}

function TOCSidebar(): ReactNode {
  const { toc } = useBlogPost();

  if (toc.length === 0) return null;

  return (
    <nav
      className="result-blog-post-toc"
      style={{
        width: "200px",
        flexShrink: 0,
        position: "sticky",
        top: "80px",
        alignSelf: "flex-start",
        borderLeft: "1px solid rgba(166, 226, 46, 0.08)",
        paddingLeft: "16px",
        maxHeight: "calc(100vh - 100px)",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.65rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "rgba(166, 226, 46, 0.7)",
          marginBottom: "12px",
        }}
      >
        ON THIS PAGE
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {toc.map(item => (
          <TOCLink key={item.id} id={item.id} value={item.value} level={item.level} />
        ))}
      </ul>
    </nav>
  );
}

function TOCLink({
  id,
  value,
  level,
}: {
  readonly id: string;
  readonly value: string;
  readonly level: number;
}): ReactNode {
  const [hovered, setHovered] = useState(false);
  const indent = (level - 2) * 12;

  return (
    <li style={{ marginBottom: "6px" }}>
      <a
        href={`#${id}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "block",
          paddingLeft: `${indent}px`,
          fontSize: "0.78rem",
          color: hovered ? ACCENT : SLATE_400,
          textDecoration: "none",
          transition: "color 0.2s",
          lineHeight: 1.4,
        }}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </li>
  );
}

function PostFooter(): ReactNode {
  const { metadata } = useBlogPost();
  const { tags, nextItem, prevItem } = metadata;

  return (
    <footer
      style={{
        marginTop: "48px",
        paddingTop: "32px",
        borderTop: "1px solid rgba(166, 226, 46, 0.1)",
      }}
    >
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "32px" }}>
          {tags.map(tag => (
            <TagPill key={tag.label} label={tag.label} permalink={tag.permalink} />
          ))}
        </div>
      )}

      {(prevItem || nextItem) && (
        <div
          className="result-blog-post-nav"
          style={{
            display: "grid",
            gridTemplateColumns: prevItem && nextItem ? "1fr 1fr" : "1fr",
            gap: "16px",
          }}
        >
          {prevItem && (
            <NavCard direction="prev" title={prevItem.title} permalink={prevItem.permalink} />
          )}
          {nextItem && (
            <NavCard direction="next" title={nextItem.title} permalink={nextItem.permalink} />
          )}
        </div>
      )}
    </footer>
  );
}

function NavCard({
  direction,
  title,
  permalink,
}: {
  readonly direction: "prev" | "next";
  readonly title: string;
  readonly permalink: string;
}): ReactNode {
  const [hovered, setHovered] = useState(false);
  const isPrev = direction === "prev";

  return (
    <a
      href={permalink}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        padding: "20px 24px",
        borderRadius: "8px",
        border: `1px solid ${hovered ? "rgba(166, 226, 46, 0.5)" : SLATE_800}`,
        background: SURFACE_BG,
        textDecoration: "none",
        transition: "border-color 0.3s",
        textAlign: isPrev ? "left" : "right",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.7rem",
          color: SLATE_500,
          marginBottom: "6px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {isPrev ? "\u2190 Previous" : "Next \u2192"}
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.95rem",
          fontWeight: 600,
          color: hovered ? ACCENT : "#FFFFFF",
          transition: "color 0.2s",
          lineHeight: 1.35,
        }}
      >
        {title}
      </div>
    </a>
  );
}

// ============================================================
// CONTENT WRAPPER
// ============================================================

function BlogPostPageContent({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <>
      <BlogPostPageMetadata />
      <BlogPostPageStructuredData />
      <Layout>
        <style>{`
          .result-blog-post-toc {
            display: block;
          }
          @media (max-width: 768px) {
            .result-blog-post-toc {
              display: none !important;
            }
            .result-blog-post-nav {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 24px 60px",
          }}
        >
          <HeroHeader />

          <div
            style={{
              display: "flex",
              gap: "40px",
              alignItems: "flex-start",
            }}
          >
            {/* Article body */}
            <article
              style={{
                flex: 1,
                minWidth: 0,
                maxWidth: "780px",
                lineHeight: 1.8,
                color: "rgba(200, 214, 229, 0.85)",
              }}
            >
              <div className="markdown">
                <MDXContent>{children}</MDXContent>
              </div>
              <PostFooter />
            </article>

            {/* TOC sidebar */}
            <TOCSidebar />
          </div>
        </div>
      </Layout>
    </>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function BlogPostPage(props: Props): ReactNode {
  const BlogPostContent = props.content;

  return (
    <BlogPostProvider content={props.content} isBlogPostPage>
      <HtmlClassNameProvider
        className={clsx(ThemeClassNames.wrapper.blogPages, ThemeClassNames.page.blogPostPage)}
      >
        <BlogPostPageContent>
          <BlogPostContent />
        </BlogPostPageContent>
      </HtmlClassNameProvider>
    </BlogPostProvider>
  );
}
