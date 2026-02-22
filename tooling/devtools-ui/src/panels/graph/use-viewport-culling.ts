/**
 * Viewport culling hook — only render visible nodes.
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import type { EnrichedGraphNode, GraphViewportState } from "./types.js";
import { VIEWPORT_CULLING_THRESHOLD, VIEWPORT_CULLING_MARGIN } from "./constants.js";

/**
 * Check if a node is within the visible viewport (plus margin).
 */
function isNodeVisible(
  node: EnrichedGraphNode,
  viewport: GraphViewportState,
  canvasWidth: number,
  canvasHeight: number,
  margin: number
): boolean {
  // Transform node position to screen space
  const screenX = node.x * viewport.zoom + viewport.panX;
  const screenY = node.y * viewport.zoom + viewport.panY;
  const screenW = node.width * viewport.zoom;
  const screenH = node.height * viewport.zoom;

  // Check if node rectangle overlaps visible area (with margin)
  return (
    screenX + screenW / 2 + margin >= 0 &&
    screenX - screenW / 2 - margin <= canvasWidth &&
    screenY + screenH / 2 + margin >= 0 &&
    screenY - screenH / 2 - margin <= canvasHeight
  );
}

/**
 * Hook filtering nodes to only those visible in the viewport.
 *
 * Only applies culling when node count exceeds threshold.
 */
function useViewportCulling(
  nodes: readonly EnrichedGraphNode[],
  viewport: GraphViewportState,
  canvasWidth: number,
  canvasHeight: number
): readonly EnrichedGraphNode[] {
  return useMemo(() => {
    if (nodes.length <= VIEWPORT_CULLING_THRESHOLD) return nodes;

    return nodes.filter(node =>
      isNodeVisible(node, viewport, canvasWidth, canvasHeight, VIEWPORT_CULLING_MARGIN)
    );
  }, [nodes, viewport, canvasWidth, canvasHeight]);
}

export { useViewportCulling, isNodeVisible };
