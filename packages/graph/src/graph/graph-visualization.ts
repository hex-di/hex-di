/**
 * Graph visualization utilities for exporting dependency graphs.
 *
 * This module provides functions to convert GraphInspection results into
 * various visualization formats like DOT (Graphviz) and Mermaid.
 *
 * @packageDocumentation
 */

import type { GraphInspection } from "./types/inspection.js";

/**
 * Options for toDotGraph visualization.
 */
export interface DotGraphOptions {
  /** Graph title (displayed at top) */
  readonly title?: string;
  /** Include lifetime labels on nodes (default: true) */
  readonly showLifetimes?: boolean;
  /** Highlight unsatisfied dependencies in red (default: true) */
  readonly highlightMissing?: boolean;
  /** Include orphan port markers (default: false) */
  readonly showOrphans?: boolean;
  /** Direction of graph layout: 'TB' (top-bottom), 'LR' (left-right), 'BT', 'RL' (default: 'TB') */
  readonly direction?: "TB" | "LR" | "BT" | "RL";
}

/**
 * Converts a graph inspection to Graphviz DOT format for visualization.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * The DOT format can be rendered using:
 * - Online: https://dreampuf.github.io/GraphvizOnline/
 * - CLI: `dot -Tpng graph.dot -o graph.png`
 * - VS Code: Graphviz Preview extension
 *
 * @example Basic usage
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter)
 *   .build();
 *
 * const dot = toDotGraph(inspectGraph(graph));
 * console.log(dot);
 * // digraph G {
 * //   rankdir=TB;
 * //   "Logger" [label="Logger\n(singleton)"];
 * //   "Database" [label="Database\n(scoped)"];
 * //   "Database" -> "Logger";
 * // }
 * ```
 *
 * @example With options
 * ```typescript
 * const dot = toDotGraph(info, {
 *   title: "My Application Graph",
 *   direction: "LR",
 *   showOrphans: true,
 *   highlightMissing: true,
 * });
 * ```
 *
 * @param inspection - The graph inspection result from inspectGraph()
 * @param options - Visualization options
 * @returns A string in Graphviz DOT format
 */
export function toDotGraph(inspection: GraphInspection, options: DotGraphOptions = {}): string {
  const {
    title,
    showLifetimes = true,
    highlightMissing = true,
    showOrphans = false,
    direction = "TB",
  } = options;

  const lines: string[] = [];
  lines.push("digraph G {");
  lines.push(`  rankdir=${direction};`);
  lines.push("  node [shape=box, style=rounded];");

  if (title) {
    lines.push(`  labelloc="t";`);
    lines.push(`  label="${escapeLabel(title)}";`);
  }

  // Track special port sets for styling
  const orphanSet = new Set(inspection.orphanPorts);
  const missingSet = new Set(inspection.unsatisfiedRequirements);

  // Create nodes for provided ports
  for (const portWithLifetime of inspection.provides) {
    const [portName, lifetimePart] = portWithLifetime.split(" (");
    const lifetime = lifetimePart?.replace(")", "") ?? "";

    const label = showLifetimes ? `${portName}\\n(${lifetime})` : portName;

    const attrs: string[] = [`label="${escapeLabel(label)}"`];

    // Color orphan nodes
    if (showOrphans && orphanSet.has(portName)) {
      attrs.push('color="orange"');
      attrs.push('style="rounded,dashed"');
    }

    // Color override nodes
    if (inspection.overrides.includes(portName)) {
      attrs.push('color="blue"');
      attrs.push('fontcolor="blue"');
    }

    lines.push(`  "${escapeLabel(portName)}" [${attrs.join(", ")}];`);
  }

  // Create nodes for missing ports (if highlighting)
  if (highlightMissing) {
    for (const missing of inspection.unsatisfiedRequirements) {
      lines.push(
        `  "${escapeLabel(missing)}" [label="${escapeLabel(missing)}\\n(MISSING)", color="red", style="rounded,dashed", fontcolor="red"];`
      );
    }
  }

  // Create edges for dependencies
  for (const [portName, deps] of Object.entries(inspection.dependencyMap)) {
    for (const dep of deps) {
      const edgeAttrs: string[] = [];

      // Highlight missing dependencies
      if (highlightMissing && missingSet.has(dep)) {
        edgeAttrs.push('color="red"');
        edgeAttrs.push('style="dashed"');
      }

      const attrStr = edgeAttrs.length > 0 ? ` [${edgeAttrs.join(", ")}]` : "";
      lines.push(`  "${escapeLabel(portName)}" -> "${escapeLabel(dep)}"${attrStr};`);
    }
  }

  lines.push("}");
  return lines.join("\n");
}

/**
 * Escapes special characters for DOT labels.
 * @pure Same inputs always produce the same output.
 * @internal
 */
function escapeLabel(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/**
 * Options for Mermaid graph visualization.
 */
export interface MermaidGraphOptions {
  /** Graph title (displayed as a label) */
  readonly title?: string;
  /** Include lifetime labels on nodes (default: true) */
  readonly showLifetimes?: boolean;
  /** Highlight unsatisfied dependencies in red (default: true) */
  readonly highlightMissing?: boolean;
  /** Include orphan port markers (default: false) */
  readonly showOrphans?: boolean;
  /** Direction of graph layout: 'TB' (top-bottom), 'LR' (left-right), 'BT', 'RL' (default: 'TB') */
  readonly direction?: "TB" | "LR" | "BT" | "RL";
  /** Show ports with finalizers (default: false) */
  readonly showFinalizers?: boolean;
}

/**
 * Converts a graph inspection to Mermaid diagram format.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * Mermaid is a widely-supported diagram format that renders in:
 * - GitHub/GitLab markdown
 * - VS Code with Mermaid extension
 * - Notion, Confluence, and many other tools
 * - https://mermaid.live/ for live editing
 *
 * @example Basic usage
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter)
 *   .build();
 *
 * const mermaid = toMermaidGraph(inspectGraph(graph));
 * console.log(mermaid);
 * // graph TD
 * //   Logger["Logger<br/>(singleton)"]
 * //   Database["Database<br/>(scoped)"]
 * //   Database --> Logger
 * ```
 *
 * @example In Markdown
 * ```markdown
 * ## Dependency Graph
 *
 * \`\`\`mermaid
 * graph TD
 *   Logger["Logger<br/>(singleton)"]
 *   Database["Database<br/>(scoped)"]
 *   Database --> Logger
 * \`\`\`
 * ```
 *
 * @example With options
 * ```typescript
 * const mermaid = toMermaidGraph(info, {
 *   title: "My Application",
 *   direction: "LR",
 *   showOrphans: true,
 *   showFinalizers: true,
 * });
 * ```
 *
 * @param inspection - The graph inspection result from inspectGraph()
 * @param options - Visualization options
 * @returns A string in Mermaid diagram format
 */
export function toMermaidGraph(
  inspection: GraphInspection,
  options: MermaidGraphOptions = {}
): string {
  const {
    title,
    showLifetimes = true,
    highlightMissing = true,
    showOrphans = false,
    direction = "TB",
    showFinalizers = false,
  } = options;

  const lines: string[] = [];
  lines.push(`graph ${direction}`);

  // Track special port sets for styling
  const orphanSet = new Set(inspection.orphanPorts);
  const missingSet = new Set(inspection.unsatisfiedRequirements);
  const finalizerSet = new Set(inspection.portsWithFinalizers);

  // Create nodes for provided ports
  for (const portWithLifetime of inspection.provides) {
    const [portName, lifetimePart] = portWithLifetime.split(" (");
    const lifetime = lifetimePart?.replace(")", "") ?? "";

    // Build label parts
    const labelParts: string[] = [escapeMermaid(portName)];
    if (showLifetimes) {
      labelParts.push(`<br/>(${lifetime})`);
    }
    if (showFinalizers && finalizerSet.has(portName)) {
      labelParts.push(`<br/>🗑️`);
    }

    const label = labelParts.join("");
    const nodeId = sanitizeNodeId(portName);

    // Determine node style
    let nodeDef = `  ${nodeId}["${label}"]`;

    // Add styling for special nodes
    if (showOrphans && orphanSet.has(portName)) {
      nodeDef += `\n  style ${nodeId} stroke-dasharray: 5 5,stroke:#f90`;
    }
    if (inspection.overrides.includes(portName)) {
      nodeDef += `\n  style ${nodeId} stroke:#00f,color:#00f`;
    }

    lines.push(nodeDef);
  }

  // Create nodes for missing ports (if highlighting)
  if (highlightMissing) {
    for (const missing of inspection.unsatisfiedRequirements) {
      const nodeId = sanitizeNodeId(missing);
      lines.push(`  ${nodeId}["${escapeMermaid(missing)}<br/>(MISSING)"]`);
      lines.push(`  style ${nodeId} stroke-dasharray: 5 5,stroke:#f00,color:#f00`);
    }
  }

  // Create edges for dependencies
  for (const [portName, deps] of Object.entries(inspection.dependencyMap)) {
    const fromId = sanitizeNodeId(portName);
    for (const dep of deps) {
      const toId = sanitizeNodeId(dep);

      // Use dashed line for missing dependencies
      if (highlightMissing && missingSet.has(dep)) {
        lines.push(`  ${fromId} -.-> ${toId}`);
      } else {
        lines.push(`  ${fromId} --> ${toId}`);
      }
    }
  }

  // Add title as a subgraph label if provided
  if (title) {
    return `---\ntitle: ${escapeMermaid(title)}\n---\n${lines.join("\n")}`;
  }

  return lines.join("\n");
}

/**
 * Sanitizes a string for use as a Mermaid node ID.
 * Node IDs must be alphanumeric (with underscores).
 * @pure Same inputs always produce the same output.
 * @internal
 */
function sanitizeNodeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Escapes special characters for Mermaid labels.
 * @pure Same inputs always produce the same output.
 * @internal
 */
function escapeMermaid(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
