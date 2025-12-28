/**
 * ContainerSelector React component for DevTools panel.
 *
 * Provides a dropdown to switch between registered containers
 * (root, child, lazy, scope) in multi-container applications.
 *
 * @packageDocumentation
 */

import React, { type ReactElement, type CSSProperties } from "react";
import { useContainerList } from "./hooks/use-container-list.js";
import type { ContainerEntry, InheritanceMode } from "./context/container-registry.js";
import { isSome, Some, None } from "./types/adt.js";
import { getInheritanceModeBadgeStyle } from "./styles.js";

// =============================================================================
// Props
// =============================================================================

/**
 * Props for the ContainerSelector component.
 */
export interface ContainerSelectorProps {
  /** Custom className for the container */
  readonly className?: string;
  /** Custom style overrides */
  readonly style?: CSSProperties;
  /** Show container kind badge */
  readonly showKind?: boolean;
  /** Compact mode (smaller padding/text) */
  readonly compact?: boolean;
}

// =============================================================================
// Styles
// =============================================================================

const selectorStyles = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  } as CSSProperties,

  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  } as CSSProperties,

  select: {
    appearance: "none",
    padding: "8px 32px 8px 12px",
    fontSize: 13,
    fontFamily: "inherit",
    fontWeight: 500,
    color: "var(--hex-devtools-text, #cdd6f4)",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: 8,
    cursor: "pointer",
    outline: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a6adc8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    minWidth: 180,
  } as CSSProperties,

  selectHover: {
    border: "1px solid var(--hex-devtools-border-hover, #565f89)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  } as CSSProperties,

  selectFocus: {
    border: "1px solid var(--hex-devtools-accent, #89b4fa)",
    boxShadow: "0 0 0 2px rgba(137, 180, 250, 0.2)",
  } as CSSProperties,

  selectCompact: {
    padding: "6px 28px 6px 10px",
    fontSize: 12,
    minWidth: 150,
  } as CSSProperties,

  kindBadge: {
    display: "inline-block",
    padding: "2px 6px",
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderRadius: 4,
    marginLeft: 8,
  } as CSSProperties,

  kindRoot: {
    backgroundColor: "rgba(137, 180, 250, 0.15)",
    color: "var(--hex-devtools-accent, #89b4fa)",
  } as CSSProperties,

  kindChild: {
    backgroundColor: "rgba(166, 227, 161, 0.15)",
    color: "#a6e3a1",
  } as CSSProperties,

  kindLazy: {
    backgroundColor: "rgba(249, 226, 175, 0.15)",
    color: "#f9e2af",
  } as CSSProperties,

  kindScope: {
    backgroundColor: "rgba(203, 166, 247, 0.15)",
    color: "#cba6f7",
  } as CSSProperties,

  emptyState: {
    fontSize: 12,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    fontStyle: "italic",
  } as CSSProperties,

  notAvailable: {
    fontSize: 11,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    opacity: 0.7,
  } as CSSProperties,
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the style for a container kind badge.
 */
function getKindStyle(kind: ContainerEntry["kind"]): CSSProperties {
  switch (kind) {
    case "root":
      return { ...selectorStyles.kindBadge, ...selectorStyles.kindRoot };
    case "child":
      return { ...selectorStyles.kindBadge, ...selectorStyles.kindChild };
    case "lazy":
      return { ...selectorStyles.kindBadge, ...selectorStyles.kindLazy };
    case "scope":
      return { ...selectorStyles.kindBadge, ...selectorStyles.kindScope };
    default:
      return selectorStyles.kindBadge;
  }
}

/**
 * Format container entry for display in the dropdown.
 *
 * For child containers with inheritance mode, includes both kind and mode:
 * - "MyContainer (child · shared)"
 */
function formatContainerLabel(entry: ContainerEntry, showKind: boolean): string {
  if (showKind) {
    if (entry.kind === "child" && entry.inheritanceMode !== undefined) {
      return `${entry.label} (${entry.kind} · ${entry.inheritanceMode})`;
    }
    return `${entry.label} (${entry.kind})`;
  }
  return entry.label;
}

// =============================================================================
// ContainerSelector Component
// =============================================================================

/**
 * ContainerSelector component for switching between registered containers.
 *
 * Features:
 * - Dropdown with all registered containers
 * - Shows container kind (root, child, lazy, scope)
 * - Visual indication of selected container
 * - Graceful handling when registry is unavailable
 *
 * @param props - The component props
 * @returns A React element containing the container selector
 *
 * @example Basic usage
 * ```tsx
 * function DevToolsHeader() {
 *   return (
 *     <div className="header">
 *       <ContainerSelector />
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Compact mode
 * ```tsx
 * function InspectorTab() {
 *   return (
 *     <div>
 *       <ContainerSelector compact showKind={false} />
 *       <ContainerInspector />
 *     </div>
 *   );
 * }
 * ```
 */
export function ContainerSelector({
  className,
  style,
  showKind = true,
  compact = false,
}: ContainerSelectorProps): ReactElement | null {
  const { containers, selectedId, selectContainer, isAvailable } = useContainerList();
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  // Don't render if registry is not available
  if (!isAvailable) {
    return <div style={selectorStyles.notAvailable}>Container registry not available</div>;
  }

  // Don't render if no containers registered
  if (containers.length === 0) {
    return <div style={selectorStyles.emptyState}>No containers registered</div>;
  }

  const selectStyle: CSSProperties = {
    ...selectorStyles.select,
    ...(compact ? selectorStyles.selectCompact : {}),
    ...(isHovered ? selectorStyles.selectHover : {}),
    ...(isFocused ? selectorStyles.selectFocus : {}),
  };

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = event.target.value;
    selectContainer(value === "" ? None : Some(value));
  };

  // Extract selected ID value for the select element
  const selectedIdValue = isSome(selectedId) ? selectedId.value : "";

  return (
    <div
      className={className}
      style={{ ...selectorStyles.container, ...style }}
      data-testid="container-selector"
    >
      <label htmlFor="container-select" style={selectorStyles.label}>
        Container
      </label>
      <select
        id="container-select"
        value={selectedIdValue}
        onChange={handleChange}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={selectStyle}
        aria-label="Select container to inspect"
      >
        <option value="" disabled>
          Select container...
        </option>
        {containers.map(entry => (
          <option key={entry.id} value={entry.id}>
            {formatContainerLabel(entry, showKind)}
          </option>
        ))}
      </select>
    </div>
  );
}

// =============================================================================
// ContainerKindBadge Component
// =============================================================================

/**
 * Props for the ContainerKindBadge component.
 */
export interface ContainerKindBadgeProps {
  /** The container kind to display */
  readonly kind: ContainerEntry["kind"];
}

/**
 * ContainerKindBadge component for displaying container type.
 *
 * @param props - The component props
 * @returns A React element containing the kind badge
 *
 * @example
 * ```tsx
 * function ContainerItem({ entry }: { entry: ContainerEntry }) {
 *   return (
 *     <div>
 *       <span>{entry.label}</span>
 *       <ContainerKindBadge kind={entry.kind} />
 *     </div>
 *   );
 * }
 * ```
 */
export function ContainerKindBadge({ kind }: ContainerKindBadgeProps): ReactElement {
  return (
    <span style={getKindStyle(kind)} data-testid="container-kind-badge">
      {kind}
    </span>
  );
}

// =============================================================================
// InheritanceModeBadge Component
// =============================================================================

/**
 * Props for the InheritanceModeBadge component.
 */
export interface InheritanceModeBadgeProps {
  /** The inheritance mode to display */
  readonly mode: InheritanceMode;
}

/**
 * InheritanceModeBadge component for displaying child container inheritance mode.
 *
 * Color coding:
 * - shared (blue): Child uses parent's singletons directly
 * - forked (orange): Child gets independent copies
 * - isolated (red): Child is completely isolated from parent
 *
 * @param props - The component props
 * @returns A React element containing the inheritance mode badge
 *
 * @example
 * ```tsx
 * function ContainerItem({ entry }: { entry: ContainerEntry }) {
 *   return (
 *     <div>
 *       <span>{entry.label}</span>
 *       <ContainerKindBadge kind={entry.kind} />
 *       {entry.kind === "child" && entry.inheritanceMode && (
 *         <InheritanceModeBadge mode={entry.inheritanceMode} />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function InheritanceModeBadge({ mode }: InheritanceModeBadgeProps): ReactElement {
  return (
    <span style={getInheritanceModeBadgeStyle(mode)} data-testid="inheritance-mode-badge">
      {mode}
    </span>
  );
}
