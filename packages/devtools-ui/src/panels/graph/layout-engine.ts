/**
 * Graph layout computation using dagre.
 *
 * Computes positions for nodes and edges from ContainerGraphData.
 *
 * @packageDocumentation
 */

import dagre from "dagre";
import type { ContainerGraphData } from "@hex-di/core";
import type { GraphLayout, LayoutNode, LayoutEdge } from "./types.js";
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  LAYOUT_NODE_SEP,
  LAYOUT_RANK_SEP,
  LAYOUT_MARGIN_X,
  LAYOUT_MARGIN_Y,
} from "./constants.js";

/**
 * Compute a dagre layout for the given graph data.
 *
 * @param graphData - Container graph data with adapters and dependency info
 * @param layoutDirection - Layout direction: "TB" (top-bottom) or "LR" (left-right)
 * @returns Layout with positioned nodes and edges
 */
function computeGraphLayout(
  graphData: ContainerGraphData,
  layoutDirection: "TB" | "LR" = "TB"
): GraphLayout {
  const g = new dagre.graphlib.Graph();

  g.setGraph({
    rankdir: layoutDirection,
    nodesep: LAYOUT_NODE_SEP,
    ranksep: LAYOUT_RANK_SEP,
    marginx: LAYOUT_MARGIN_X,
    marginy: LAYOUT_MARGIN_Y,
  });

  g.setDefaultEdgeLabel(() => ({}));

  for (const adapter of graphData.adapters) {
    g.setNode(adapter.portName, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      label: adapter.portName,
    });
  }

  for (const adapter of graphData.adapters) {
    for (const depName of adapter.dependencyNames) {
      if (g.hasNode(depName)) {
        g.setEdge(depName, adapter.portName);
      }
    }
  }

  dagre.layout(g);

  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  for (const adapter of graphData.adapters) {
    const node = g.node(adapter.portName);
    if (node) {
      nodes.push({
        adapter,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      });
    }
  }

  for (const edgeObj of g.edges()) {
    const edge = g.edge(edgeObj);
    if (edge?.points) {
      edges.push({
        source: edgeObj.v,
        target: edgeObj.w,
        points: edge.points.map((p: { x: number; y: number }) => ({
          x: p.x,
          y: p.y,
        })),
      });
    }
  }

  const graphInfo = g.graph();
  const totalWidth = graphInfo?.width ?? 0;
  const totalHeight = graphInfo?.height ?? 0;

  return {
    nodes,
    edges,
    width: totalWidth,
    height: totalHeight,
  };
}

export { computeGraphLayout };
