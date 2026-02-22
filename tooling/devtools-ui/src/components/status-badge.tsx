/**
 * StatusBadge component for displaying lifetime and status indicators.
 *
 * Renders a small pill-shaped badge with color based on the variant type.
 *
 * @packageDocumentation
 */

/**
 * Supported badge variant types.
 */
type BadgeVariant =
  | "singleton"
  | "scoped"
  | "transient"
  | "resolved"
  | "unresolved"
  | "error"
  | "disposed";

interface StatusBadgeProps {
  readonly variant: BadgeVariant;
  readonly label?: string;
}

/**
 * Maps badge variants to CSS custom property color names.
 */
function getVariantColor(variant: BadgeVariant): string {
  switch (variant) {
    case "singleton":
      return "var(--hex-lifetime-singleton)";
    case "scoped":
      return "var(--hex-lifetime-scoped)";
    case "transient":
      return "var(--hex-lifetime-transient)";
    case "resolved":
      return "var(--hex-success)";
    case "unresolved":
      return "var(--hex-text-muted)";
    case "error":
      return "var(--hex-error)";
    case "disposed":
      return "var(--hex-text-muted)";
  }
}

function getVariantBgColor(variant: BadgeVariant): string {
  switch (variant) {
    case "singleton":
      return "var(--hex-accent-muted)";
    case "scoped":
      return "var(--hex-success-muted)";
    case "transient":
      return "var(--hex-warning-muted)";
    case "resolved":
      return "var(--hex-success-muted)";
    case "unresolved":
      return "var(--hex-bg-badge)";
    case "error":
      return "var(--hex-error-muted)";
    case "disposed":
      return "var(--hex-bg-badge)";
  }
}

/**
 * StatusBadge displays a pill-shaped badge indicating lifetime or status.
 */
function StatusBadge({ variant, label }: StatusBadgeProps): React.ReactElement {
  const displayLabel = label ?? variant;
  const color = getVariantColor(variant);
  const bgColor = getVariantBgColor(variant);
  const textDecoration = variant === "disposed" ? "line-through" : "none";

  return (
    <span
      data-testid={`status-badge-${variant}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--hex-space-xxs)",
        padding: "2px var(--hex-space-sm)",
        borderRadius: "var(--hex-radius-pill)",
        backgroundColor: bgColor,
        color,
        fontSize: "var(--hex-font-size-xs)",
        fontFamily: "var(--hex-font-mono)",
        fontWeight: "var(--hex-font-weight-medium)",
        lineHeight: "var(--hex-line-height-tight)",
        textDecoration,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: color,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  );
}

export { StatusBadge };
export type { StatusBadgeProps, BadgeVariant };
