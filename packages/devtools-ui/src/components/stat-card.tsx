/**
 * StatCard component for displaying numeric statistics.
 *
 * Shows a label and value in a compact card format,
 * used in panel summary rows.
 *
 * @packageDocumentation
 */

import { useState } from "react";

type StatCardVariant = "neutral" | "success" | "warning" | "error";

interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly variant?: StatCardVariant;
  readonly description?: string;
}

function getVariantColor(variant: StatCardVariant): string | undefined {
  switch (variant) {
    case "success":
      return "var(--hex-success)";
    case "warning":
      return "var(--hex-warning)";
    case "error":
      return "var(--hex-error)";
    case "neutral":
      return undefined;
  }
}

function getVariantMutedColor(variant: StatCardVariant): string | undefined {
  switch (variant) {
    case "success":
      return "var(--hex-success-muted)";
    case "warning":
      return "var(--hex-warning-muted)";
    case "error":
      return "var(--hex-error-muted)";
    case "neutral":
      return undefined;
  }
}

/**
 * StatCard displays a labeled numeric value in a compact card.
 */
function StatCard({
  label,
  value,
  variant = "neutral",
  description,
}: StatCardProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);
  const accentColor = getVariantColor(variant);
  const mutedColor = getVariantMutedColor(variant);

  return (
    <div
      data-testid="stat-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--hex-space-xs)",
        padding: "var(--hex-space-lg)",
        backgroundColor: mutedColor
          ? mutedColor
          : isHovered
            ? "var(--hex-bg-tertiary)"
            : "var(--hex-bg-secondary)",
        borderRadius: "var(--hex-radius-lg)",
        border: "1px solid var(--hex-border)",
        borderLeft: accentColor ? `3px solid ${accentColor}` : "1px solid var(--hex-border)",
        minWidth: "120px",
        boxShadow: isHovered ? "0 4px 14px rgba(0,0,0,0.15)" : "none",
        transition: "all var(--hex-transition-fast)",
        cursor: "default",
      }}
    >
      <span
        style={{
          fontSize: "var(--hex-font-size-xs)",
          fontFamily: "var(--hex-font-sans)",
          fontWeight: "var(--hex-font-weight-medium)",
          color: "var(--hex-text-muted)",
          lineHeight: "var(--hex-line-height-tight)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "var(--hex-font-size-xxl)",
          fontFamily: "var(--hex-font-sans)",
          fontWeight: "var(--hex-font-weight-semibold)",
          color: accentColor ?? "var(--hex-text-primary)",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      {description !== undefined && (
        <span
          style={{
            fontSize: "var(--hex-font-size-xs)",
            fontFamily: "var(--hex-font-sans)",
            color: "var(--hex-text-muted)",
            lineHeight: "var(--hex-line-height-tight)",
          }}
        >
          {description}
        </span>
      )}
    </div>
  );
}

export { StatCard };
export type { StatCardProps, StatCardVariant };
