/**
 * Edge state components for the graph panel.
 *
 * Handles empty, loading, disposed, disconnected, filtered-out,
 * large graph warning, single node, depth limit, skeleton, and disposing states.
 *
 * @packageDocumentation
 */

import { EmptyState } from "../../../components/empty-state.js";

type GraphEdgeStateKind =
  | "empty"
  | "loading"
  | "disposed"
  | "disconnected"
  | "filtered-out"
  | "large-graph-warning"
  | "single-node"
  | "depth-limit"
  | "skeleton"
  | "disposing";

interface GraphEdgeStateProps {
  readonly kind: GraphEdgeStateKind;
  readonly adapterCount?: number;
  readonly onDismiss?: () => void;
}

function getEdgeStateConfig(kind: GraphEdgeStateKind): {
  icon: string;
  message: string;
  description?: string;
} {
  switch (kind) {
    case "empty":
      return {
        icon: "\uD83D\uDD78\uFE0F",
        message: "No graph data available",
        description:
          "Run your code to see the dependency graph with ports, adapters, and their connections.",
      };
    case "loading":
      return {
        icon: "\u23F3",
        message: "Loading graph data...",
        description: "Waiting for container inspection data.",
      };
    case "disposed":
      return {
        icon: "\uD83D\uDDD1\uFE0F",
        message: "Container has been disposed",
        description: "The container was disposed. Data shown is from the last snapshot.",
      };
    case "disconnected":
      return {
        icon: "\uD83D\uDD0C",
        message: "Disconnected from data source",
        description: "The connection to the data source was lost. Attempting to reconnect...",
      };
    case "filtered-out":
      return {
        icon: "\uD83D\uDD0D",
        message: "All nodes filtered out",
        description: "No nodes match the current filter criteria. Try adjusting your filters.",
      };
    case "large-graph-warning":
      return {
        icon: "\u26A0\uFE0F",
        message: "Large graph detected",
        description: "This graph has many nodes. Consider using filters to reduce the visible set.",
      };
    case "single-node":
      return {
        icon: "\uD83D\uDFE2",
        message: "Single node graph",
        description: "This container has only one adapter with no dependencies.",
      };
    case "depth-limit":
      return {
        icon: "\u26A0\uFE0F",
        message: "Depth limit exceeded",
        description:
          "The dependency chain exceeds the display depth limit. Some nodes may not be shown.",
      };
    case "skeleton":
      return {
        icon: "\u23F3",
        message: "Preparing graph...",
      };
    case "disposing":
      return {
        icon: "\u23F3",
        message: "Container is disposing...",
        description: "The container is being disposed. Data may change.",
      };
  }
}

function GraphEdgeState({
  kind,
  adapterCount,
  onDismiss,
}: GraphEdgeStateProps): React.ReactElement {
  const config = getEdgeStateConfig(kind);

  return (
    <div data-testid={`graph-edge-state-${kind}`} style={{ position: "relative", height: "100%" }}>
      <EmptyState icon={config.icon} message={config.message} description={config.description} />
      {kind === "large-graph-warning" && adapterCount !== undefined && (
        <div
          style={{
            textAlign: "center",
            marginTop: "var(--hex-space-sm)",
            fontFamily: "var(--hex-font-sans)",
            fontSize: "var(--hex-font-size-sm)",
            color: "var(--hex-text-muted)",
          }}
        >
          {adapterCount} adapters in this container
        </div>
      )}
      {onDismiss !== undefined && (
        <div style={{ textAlign: "center", marginTop: "var(--hex-space-sm)" }}>
          <button
            onClick={onDismiss}
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
            {kind === "large-graph-warning" ? "Show Anyway" : "Dismiss"}
          </button>
        </div>
      )}
    </div>
  );
}

export { GraphEdgeState };
export type { GraphEdgeStateProps, GraphEdgeStateKind };
