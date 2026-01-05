/**
 * FilterChip components for graph filtering UI.
 *
 * Provides reusable chip components for filtering graph nodes by
 * lifetime, container, ownership, and other criteria.
 *
 * @packageDocumentation
 */

import React, { type ReactElement, type ReactNode, useCallback } from "react";

// =============================================================================
// Types
// =============================================================================

export interface FilterChipProps {
  /** The label to display on the chip */
  readonly label: string;
  /** Whether the chip is currently active (selected) */
  readonly isActive: boolean;
  /** Callback when the chip is clicked */
  readonly onClick: () => void;
  /** Optional color for the chip (used for lifetime chips) */
  readonly color?: string;
  /** Optional aria-label for accessibility */
  readonly ariaLabel?: string;
}

export interface FilterChipGroupProps {
  /** Group label displayed above the chips */
  readonly label: string;
  /** Chip children */
  readonly children: ReactNode;
}

// =============================================================================
// Styles
// =============================================================================

const chipStyles = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 500,
    fontFamily: "var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    color: "var(--hex-devtools-text, #cdd6f4)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    userSelect: "none" as const,
  },
  active: {
    backgroundColor: "var(--hex-devtools-accent, #89b4fa)",
    borderColor: "var(--hex-devtools-accent, #89b4fa)",
    color: "var(--hex-devtools-bg, #1e1e2e)",
  },
  hover: {
    filter: "brightness(1.1)",
  },
  colorDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
} as const;

const groupStyles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  label: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  chips: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
  },
} as const;

// =============================================================================
// Components
// =============================================================================

/**
 * A single filter chip that can be toggled on/off.
 *
 * Used for filtering by lifetime, ownership, container, etc.
 * Supports an optional color dot for visual distinction.
 */
export function FilterChip({
  label,
  isActive,
  onClick,
  color,
  ariaLabel,
}: FilterChipProps): ReactElement {
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  return (
    <button
      type="button"
      role="button"
      aria-label={ariaLabel ?? label}
      aria-pressed={isActive}
      data-active={isActive ? "true" : "false"}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        ...chipStyles.base,
        ...(isActive ? chipStyles.active : {}),
      }}
    >
      {color !== undefined && (
        <span
          style={{
            ...chipStyles.colorDot,
            backgroundColor: color,
          }}
        />
      )}
      {label}
    </button>
  );
}

/**
 * A group of related filter chips with a label.
 *
 * Used to visually organize chips by category (e.g., "Lifetime", "Ownership").
 */
export function FilterChipGroup({ label, children }: FilterChipGroupProps): ReactElement {
  return (
    <div style={groupStyles.container}>
      <span style={groupStyles.label}>{label}</span>
      <div style={groupStyles.chips}>{children}</div>
    </div>
  );
}
