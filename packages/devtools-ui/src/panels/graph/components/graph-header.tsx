/**
 * GraphHeader — container selector, adapter counts, phase badges.
 *
 * @packageDocumentation
 */

import type { ContainerGraphData, MultiContainerGraphState } from "../types.js";

interface GraphHeaderProps {
  readonly multiContainerState: MultiContainerGraphState;
  readonly selectedContainerName: string | undefined;
  readonly layoutDirection: "TB" | "LR";
  readonly onContainerChange: (containerName: string | undefined) => void;
  readonly onCompare?: () => void;
}

function getKindBadgeColor(kind: string): string {
  switch (kind) {
    case "root":
      return "var(--hex-accent)";
    case "child":
      return "var(--hex-info)";
    case "lazy":
      return "var(--hex-warning)";
    default:
      return "var(--hex-text-muted)";
  }
}

function GraphHeader({
  multiContainerState,
  selectedContainerName,
  layoutDirection,
  onContainerChange,
  onCompare,
}: GraphHeaderProps): React.ReactElement {
  const { containers, activeGraph } = multiContainerState;
  const containerEntries = [...containers.entries()];

  // Sort: root first, then children, then lazy
  const sorted = containerEntries.sort(([, a], [, b]) => {
    const kindOrder = { root: 0, child: 1, lazy: 2 };
    return (kindOrder[a.kind] ?? 3) - (kindOrder[b.kind] ?? 3);
  });

  const adapterCount = activeGraph?.adapters.length ?? 0;

  return (
    <div
      data-testid="graph-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--hex-space-sm)",
        padding: "var(--hex-space-xs) var(--hex-space-sm)",
        backgroundColor: "var(--hex-bg-secondary)",
        borderBottom: "1px solid var(--hex-border)",
        fontFamily: "var(--hex-font-sans)",
        fontSize: "var(--hex-font-size-sm)",
      }}
    >
      {/* Container dropdown */}
      <label style={{ color: "var(--hex-text-muted)", fontSize: "var(--hex-font-size-xs)" }}>
        Container:
      </label>
      <select
        data-testid="container-selector"
        value={selectedContainerName ?? ""}
        onChange={e => onContainerChange(e.target.value === "" ? undefined : e.target.value)}
        style={{
          padding: "var(--hex-space-xs)",
          border: "1px solid var(--hex-border)",
          borderRadius: "var(--hex-radius-sm)",
          backgroundColor: "var(--hex-bg-primary)",
          color: "var(--hex-text-primary)",
          fontFamily: "var(--hex-font-mono)",
          fontSize: "var(--hex-font-size-sm)",
          minWidth: 140,
        }}
        aria-label="Select container"
      >
        {sorted.map(([name, data]) => (
          <option key={name} value={name}>
            {data.parentName !== null ? "  " : ""}
            {name} ({data.kind})
          </option>
        ))}
      </select>

      {/* Kind badge */}
      {activeGraph !== undefined && (
        <span
          data-testid="kind-badge"
          style={{
            padding: "1px 6px",
            borderRadius: 4,
            backgroundColor: getKindBadgeColor(activeGraph.kind),
            color: "var(--hex-text-inverse)",
            fontSize: "10px",
            fontWeight: "bold",
            textTransform: "uppercase",
          }}
        >
          {activeGraph.kind}
        </span>
      )}

      {/* Adapter count */}
      <span style={{ color: "var(--hex-text-muted)" }}>
        {adapterCount} adapter{adapterCount !== 1 ? "s" : ""}
      </span>

      {/* Direction indicator */}
      <span style={{ color: "var(--hex-text-muted)" }}>
        {layoutDirection === "TB" ? "\u2193" : "\u2192"}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Compare button */}
      {containers.size > 1 && onCompare !== undefined && (
        <button
          data-testid="compare-button"
          onClick={onCompare}
          style={{
            padding: "var(--hex-space-xs) var(--hex-space-sm)",
            border: "1px solid var(--hex-border)",
            borderRadius: "var(--hex-radius-sm)",
            backgroundColor: "var(--hex-bg-secondary)",
            color: "var(--hex-text-primary)",
            cursor: "pointer",
            fontFamily: "var(--hex-font-sans)",
            fontSize: "var(--hex-font-size-sm)",
          }}
        >
          Compare
        </button>
      )}
    </div>
  );
}

export { GraphHeader };
export type { GraphHeaderProps };
