/**
 * ASCII Graph Renderer - Renders dependency graphs as ASCII art.
 *
 * @packageDocumentation
 */

import type { ExportedGraph, ExportedNode, ExportedEdge } from "@hex-di/devtools-core";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for ASCII graph rendering.
 */
export interface AsciiGraphOptions {
  /**
   * Show lifetime badges.
   * @default true
   */
  readonly showLifetime?: boolean;

  /**
   * Show factory kind (sync/async).
   * @default false
   */
  readonly showFactoryKind?: boolean;

  /**
   * Maximum width in characters.
   * @default 80
   */
  readonly maxWidth?: number;

  /**
   * Use colors (ANSI escape codes).
   * @default true
   */
  readonly useColors?: boolean;
}

// =============================================================================
// Color Constants
// =============================================================================

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  // Lifetime colors
  singleton: "\x1b[32m", // green
  scoped: "\x1b[34m", // blue
  request: "\x1b[33m", // yellow
  // Other
  arrow: "\x1b[36m", // cyan
  async: "\x1b[35m", // magenta
} as const;

// =============================================================================
// ASCII Graph Renderer
// =============================================================================

/**
 * Render a dependency graph as ASCII art.
 *
 * @example
 * ```typescript
 * import { renderAsciiGraph } from '@hex-di/devtools-tui';
 * import { toJSON } from '@hex-di/devtools-core';
 *
 * const graph = toJSON(myGraph);
 * console.log(renderAsciiGraph(graph));
 * ```
 */
export function renderAsciiGraph(
  graph: ExportedGraph,
  options: AsciiGraphOptions = {}
): string {
  const {
    showLifetime = true,
    showFactoryKind = false,
    maxWidth = 80,
    useColors = true,
  } = options;

  if (graph.nodes.length === 0) {
    return useColors
      ? `${COLORS.dim}(empty graph)${COLORS.reset}`
      : "(empty graph)";
  }

  const lines: string[] = [];

  // Header
  lines.push(useColors ? `${COLORS.bold}Dependency Graph${COLORS.reset}` : "Dependency Graph");
  lines.push("═".repeat(Math.min(maxWidth, 40)));
  lines.push("");

  // Build dependency map
  const deps = new Map<string, string[]>();
  for (const node of graph.nodes) {
    deps.set(node.id, []);
  }
  for (const edge of graph.edges) {
    const nodeDeps = deps.get(edge.from);
    if (nodeDeps) {
      nodeDeps.push(edge.to);
    }
  }

  // Find root nodes (nodes with no dependents)
  const hasDependent = new Set<string>();
  for (const edge of graph.edges) {
    hasDependent.add(edge.to);
  }
  const rootNodes = graph.nodes.filter((n) => !hasDependent.has(n.id));

  // Render tree from each root
  const visited = new Set<string>();
  for (const root of rootNodes) {
    renderNode(root, deps, graph, 0, visited, lines, {
      showLifetime,
      showFactoryKind,
      useColors,
    });
  }

  // Render any disconnected nodes
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      renderNode(node, deps, graph, 0, visited, lines, {
        showLifetime,
        showFactoryKind,
        useColors,
      });
    }
  }

  // Stats footer
  lines.push("");
  lines.push("─".repeat(Math.min(maxWidth, 40)));
  const singletonCount = graph.nodes.filter((n) => n.lifetime === "singleton").length;
  const scopedCount = graph.nodes.filter((n) => n.lifetime === "scoped").length;
  const requestCount = graph.nodes.filter((n) => n.lifetime === "transient").length;

  if (useColors) {
    lines.push(
      `${COLORS.dim}Nodes: ${graph.nodes.length}${COLORS.reset} | ` +
        `${COLORS.singleton}●${COLORS.reset} Singleton: ${singletonCount} | ` +
        `${COLORS.scoped}●${COLORS.reset} Scoped: ${scopedCount} | ` +
        `${COLORS.request}●${COLORS.reset} Request: ${requestCount}`
    );
  } else {
    lines.push(
      `Nodes: ${graph.nodes.length} | ` +
        `Singleton: ${singletonCount} | ` +
        `Scoped: ${scopedCount} | ` +
        `Request: ${requestCount}`
    );
  }

  return lines.join("\n");
}

function renderNode(
  node: ExportedNode,
  deps: Map<string, string[]>,
  graph: ExportedGraph,
  depth: number,
  visited: Set<string>,
  lines: string[],
  options: { showLifetime: boolean; showFactoryKind: boolean; useColors: boolean }
): void {
  if (visited.has(node.id)) {
    const indent = "  ".repeat(depth);
    lines.push(
      options.useColors
        ? `${indent}${COLORS.dim}└─ (${node.id}) [circular]${COLORS.reset}`
        : `${indent}└─ (${node.id}) [circular]`
    );
    return;
  }

  visited.add(node.id);

  const indent = depth > 0 ? "  ".repeat(depth - 1) + "├─ " : "";
  const lifetimeColor =
    COLORS[node.lifetime as keyof typeof COLORS] ?? COLORS.reset;
  const lifetimeBadge = options.showLifetime
    ? options.useColors
      ? ` ${lifetimeColor}[${node.lifetime}]${COLORS.reset}`
      : ` [${node.lifetime}]`
    : "";
  const asyncBadge =
    options.showFactoryKind && node.factoryKind === "async"
      ? options.useColors
        ? ` ${COLORS.async}(async)${COLORS.reset}`
        : " (async)"
      : "";

  lines.push(`${indent}${node.label}${lifetimeBadge}${asyncBadge}`);

  const nodeDeps = deps.get(node.id) ?? [];
  for (const depId of nodeDeps) {
    const depNode = graph.nodes.find((n) => n.id === depId);
    if (depNode) {
      renderNode(depNode, deps, graph, depth + 1, visited, lines, options);
    }
  }
}

/**
 * Render a simple list view of nodes.
 */
export function renderNodeList(
  graph: ExportedGraph,
  options: { useColors?: boolean } = {}
): string {
  const { useColors = true } = options;

  if (graph.nodes.length === 0) {
    return useColors
      ? `${COLORS.dim}No services registered${COLORS.reset}`
      : "No services registered";
  }

  const lines: string[] = [];

  // Sort by lifetime then by name
  const sorted = [...graph.nodes].sort((a, b) => {
    const lifetimeOrder = { singleton: 0, scoped: 1, request: 2 };
    const aOrder = lifetimeOrder[a.lifetime as keyof typeof lifetimeOrder] ?? 3;
    const bOrder = lifetimeOrder[b.lifetime as keyof typeof lifetimeOrder] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.label.localeCompare(b.label);
  });

  for (const node of sorted) {
    const lifetimeColor =
      COLORS[node.lifetime as keyof typeof COLORS] ?? COLORS.reset;
    const badge = useColors
      ? `${lifetimeColor}●${COLORS.reset}`
      : `[${node.lifetime.charAt(0).toUpperCase()}]`;

    lines.push(`  ${badge} ${node.label}`);
  }

  return lines.join("\n");
}
