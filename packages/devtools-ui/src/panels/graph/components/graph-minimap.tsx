/**
 * GraphMinimap — bottom-left overlay showing a birds-eye view.
 *
 * @packageDocumentation
 */

import type { EnrichedGraphNode, GraphViewportState, GraphLayout } from "../types.js";
import { MINIMAP_WIDTH, MINIMAP_HEIGHT, MINIMAP_PADDING } from "../constants.js";

interface GraphMinimapProps {
  readonly nodes: readonly EnrichedGraphNode[];
  readonly layout: GraphLayout;
  readonly viewport: GraphViewportState;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly visible: boolean;
  readonly onViewportChange?: (viewport: GraphViewportState) => void;
}

function getLifetimeDotColor(lifetime: string): string {
  switch (lifetime) {
    case "singleton":
      return "var(--hex-lifetime-singleton)";
    case "scoped":
      return "var(--hex-lifetime-scoped)";
    case "transient":
      return "var(--hex-lifetime-transient)";
    default:
      return "var(--hex-text-muted)";
  }
}

function GraphMinimap({
  nodes,
  layout,
  viewport,
  canvasWidth,
  canvasHeight,
  visible,
}: GraphMinimapProps): React.ReactElement | null {
  if (!visible || nodes.length === 0) return null;

  const graphWidth = Math.max(layout.width, 1);
  const graphHeight = Math.max(layout.height, 1);

  const scale = Math.min(
    (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / graphWidth,
    (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / graphHeight
  );

  // Viewport rectangle in minimap space
  const viewX = (-viewport.panX / viewport.zoom) * scale + MINIMAP_PADDING;
  const viewY = (-viewport.panY / viewport.zoom) * scale + MINIMAP_PADDING;
  const viewW = (canvasWidth / viewport.zoom) * scale;
  const viewH = (canvasHeight / viewport.zoom) * scale;

  return (
    <div
      data-testid="graph-minimap"
      style={{
        position: "absolute",
        bottom: MINIMAP_PADDING,
        left: MINIMAP_PADDING,
        width: MINIMAP_WIDTH,
        height: MINIMAP_HEIGHT,
        backgroundColor: "var(--hex-bg-secondary)",
        border: "1px solid var(--hex-border)",
        borderRadius: "var(--hex-radius-sm)",
        overflow: "hidden",
        pointerEvents: "auto",
      }}
      role="complementary"
      aria-label="Graph minimap"
    >
      <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT}>
        {/* Node dots */}
        {nodes.map(node => (
          <circle
            key={node.adapter.portName}
            cx={node.x * scale + MINIMAP_PADDING}
            cy={node.y * scale + MINIMAP_PADDING}
            r={3}
            fill={getLifetimeDotColor(node.adapter.lifetime)}
            opacity={node.matchesFilter ? 1 : 0.3}
          />
        ))}

        {/* Viewport rectangle */}
        <rect
          x={viewX}
          y={viewY}
          width={Math.max(viewW, 4)}
          height={Math.max(viewH, 4)}
          fill="var(--hex-accent)"
          fillOpacity={0.15}
          stroke="var(--hex-accent)"
          strokeWidth={1}
          rx={2}
        />
      </svg>
    </div>
  );
}

export { GraphMinimap };
export type { GraphMinimapProps };
