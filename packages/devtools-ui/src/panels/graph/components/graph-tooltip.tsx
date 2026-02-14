/**
 * GraphTooltip — hover tooltip near cursor with node details.
 *
 * Repositions to stay within viewport bounds.
 *
 * @packageDocumentation
 */

import type { EnrichedGraphNode } from "../types.js";

interface GraphTooltipProps {
  readonly node: EnrichedGraphNode | undefined;
  readonly x: number;
  readonly y: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
}

const TOOLTIP_WIDTH = 220;
const TOOLTIP_OFFSET = 12;

function GraphTooltip({ node, x, y, canvasWidth }: GraphTooltipProps): React.ReactElement | null {
  if (node === undefined) return null;

  // Position tooltip to the right by default, flip left if near edge
  const flipX = x + TOOLTIP_WIDTH + TOOLTIP_OFFSET > canvasWidth;
  const left = flipX ? x - TOOLTIP_WIDTH - TOOLTIP_OFFSET : x + TOOLTIP_OFFSET;
  const top = y + TOOLTIP_OFFSET;

  return (
    <div
      data-testid="graph-tooltip"
      role="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        width: TOOLTIP_WIDTH,
        padding: "var(--hex-space-sm)",
        backgroundColor: "var(--hex-bg-secondary)",
        border: "1px solid var(--hex-border)",
        borderRadius: "var(--hex-radius-sm)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        fontFamily: "var(--hex-font-sans)",
        fontSize: "var(--hex-font-size-sm)",
        color: "var(--hex-text-primary)",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      <div style={{ fontWeight: "var(--hex-font-weight-medium)" }}>{node.adapter.portName}</div>
      <div style={{ color: "var(--hex-text-muted)", marginTop: 2 }}>
        {node.adapter.lifetime} &middot; {node.adapter.origin}
        {node.adapter.factoryKind === "async" ? " &middot; async" : ""}
      </div>
      {node.description !== undefined && (
        <div style={{ marginTop: 4, color: "var(--hex-text-secondary)" }}>{node.description}</div>
      )}
      {node.category !== undefined && (
        <div style={{ marginTop: 2, color: "var(--hex-text-muted)" }}>
          Category: {node.category}
        </div>
      )}
      {node.direction !== undefined && (
        <div style={{ marginTop: 2, color: "var(--hex-text-muted)" }}>
          Direction: {node.direction}
        </div>
      )}
      {node.errorRate !== undefined && node.errorRate > 0 && (
        <div
          style={{
            marginTop: 2,
            color: node.hasHighErrorRate ? "var(--hex-error)" : "var(--hex-warning)",
          }}
        >
          Error rate: {Math.round(node.errorRate * 100)}%
        </div>
      )}
      <div style={{ marginTop: 2, color: "var(--hex-text-muted)" }}>
        Dependencies: {node.adapter.dependencyNames.length} &middot; Dependents:{" "}
        {node.dependentCount}
      </div>
    </div>
  );
}

export { GraphTooltip };
export type { GraphTooltipProps };
