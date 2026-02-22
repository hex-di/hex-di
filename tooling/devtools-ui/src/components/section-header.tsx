/**
 * SectionHeader component for consistent panel section titles.
 *
 * Replaces ad-hoc h2 styling with a reusable component that
 * provides visual hierarchy with optional subtitles and counts.
 *
 * @packageDocumentation
 */

interface SectionHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly count?: number;
  readonly level?: 2 | 3;
}

/**
 * SectionHeader renders a styled heading with optional subtitle and count badge.
 */
function SectionHeader({
  title,
  subtitle,
  count,
  level = 2,
}: SectionHeaderProps): React.ReactElement {
  const Tag = level === 2 ? "h2" : "h3";
  const fontSize = level === 2 ? "var(--hex-font-size-xl)" : "var(--hex-font-size-lg)";

  return (
    <div
      style={{
        marginBottom: "var(--hex-space-lg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--hex-space-sm)",
        }}
      >
        <Tag
          style={{
            fontSize,
            fontFamily: "var(--hex-font-sans)",
            fontWeight: "var(--hex-font-weight-semibold)",
            color: "var(--hex-text-primary)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </Tag>
        {count !== undefined && (
          <span
            style={{
              fontSize: "var(--hex-font-size-xs)",
              fontFamily: "var(--hex-font-mono)",
              fontWeight: "var(--hex-font-weight-medium)",
              color: "var(--hex-text-muted)",
              backgroundColor: "var(--hex-bg-badge)",
              padding: "1px var(--hex-space-sm)",
              borderRadius: "var(--hex-radius-pill)",
            }}
          >
            {count}
          </span>
        )}
      </div>
      {subtitle !== undefined && (
        <p
          style={{
            fontSize: "var(--hex-font-size-sm)",
            fontFamily: "var(--hex-font-sans)",
            color: "var(--hex-text-muted)",
            margin: "var(--hex-space-xxs) 0 0",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export { SectionHeader };
export type { SectionHeaderProps };
