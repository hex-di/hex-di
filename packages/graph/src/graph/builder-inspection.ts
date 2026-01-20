/**
 * Runtime inspection utilities for dependency graphs.
 *
 * This module provides runtime inspection capabilities for built graphs,
 * complementing the compile-time validation performed by GraphBuilder.
 *
 * @packageDocumentation
 */

import type { AdapterAny } from "../adapter";

/**
 * Structural type for graph-like objects that can be inspected.
 *
 * This type captures only the runtime-necessary fields for inspection,
 * allowing both Graph and GraphBuilder to be inspected without requiring
 * phantom type properties.
 *
 * @internal
 */
interface InspectableGraph {
  readonly adapters: readonly AdapterAny[];
  readonly overridePortNames: ReadonlySet<string>;
}

/**
 * Threshold for depth warning. When maxChainDepth reaches this value,
 * a warning is generated to alert users that compile-time detection limits
 * are approaching.
 *
 * @internal
 */
const DEPTH_WARNING_THRESHOLD = 25;

/**
 * Runtime inspection result for debugging.
 *
 * Call `builder.inspect()` to get a snapshot of the current graph state,
 * including adapter count, provided ports, unsatisfied requirements, and
 * dependency structure.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter);
 *
 * const inspection = builder.inspect();
 * console.log(inspection.summary);
 * // "Graph(2 adapters, 0 unsatisfied): Logger (singleton), Database (scoped)"
 *
 * if (inspection.maxChainDepth > 25) {
 *   console.warn('Deep dependency chain detected, consider restructuring');
 * }
 * ```
 */
/**
 * A suggestion for resolving a graph configuration issue.
 *
 * Suggestions are generated based on the current graph state and provide
 * actionable guidance for completing or improving the graph.
 */
export interface GraphSuggestion {
  /** Type of suggestion */
  readonly type: "missing_adapter" | "depth_warning" | "orphan_port";
  /** The port name this suggestion relates to */
  readonly portName: string;
  /** Human-readable description of the issue */
  readonly message: string;
  /** Suggested action to resolve the issue */
  readonly action: string;
}

export interface GraphInspection {
  /** Number of adapters registered in this builder */
  readonly adapterCount: number;
  /** List of provided ports with their lifetimes (e.g., "Logger (singleton)") */
  readonly provides: readonly string[];
  /** Port names that are required but not yet provided */
  readonly unsatisfiedRequirements: readonly string[];
  /** Map of port name to its direct dependency port names */
  readonly dependencyMap: Readonly<Record<string, readonly string[]>>;
  /** Port names marked as overrides for parent containers */
  readonly overrides: readonly string[];
  /**
   * Maximum dependency chain depth in the current graph.
   *
   * If this approaches 30, type-level cycle detection may not reach all paths.
   * Consider restructuring or using `buildFragment()` for deep subgraphs.
   */
  readonly maxChainDepth: number;
  /**
   * Warning message when maxChainDepth approaches the compile-time limit.
   *
   * Present when maxChainDepth >= 25 (the warning threshold).
   * When this warning appears, consider:
   * - Restructuring the dependency graph to reduce depth
   * - Using `buildFragment()` for deep subgraphs
   * - Splitting into smaller, independent graphs
   */
  readonly depthWarning?: string;
  /** Human-readable summary of the graph state */
  readonly summary: string;
  /** True if all requirements are satisfied (ready to build) */
  readonly isComplete: boolean;
  /**
   * Actionable suggestions for resolving graph issues.
   *
   * Includes suggestions for:
   * - Missing adapters (based on unsatisfied requirements)
   * - Depth warnings (when approaching compile-time limits)
   * - Orphan ports (ports provided but never required by others)
   *
   * @example
   * ```typescript
   * const info = builder.inspect();
   * for (const suggestion of info.suggestions) {
   *   console.log(`[${suggestion.type}] ${suggestion.message}`);
   *   console.log(`  Action: ${suggestion.action}`);
   * }
   * ```
   */
  readonly suggestions: readonly GraphSuggestion[];
  /**
   * Ports that are provided but not required by any other adapter.
   *
   * Orphan ports may indicate:
   * - Entry points (intentionally not required)
   * - Dead code (accidentally unreferenced adapters)
   *
   * Use this to audit your graph for unused services.
   */
  readonly orphanPorts: readonly string[];
}

/**
 * Computes the maximum dependency chain depth in a dependency map.
 *
 * Uses memoized DFS to find the longest path through the dependency graph.
 * This helps users understand if their graph is approaching the type-level
 * MaxDepth limit (30) for cycle detection.
 *
 * @param depMap - Map of port name to its dependency port names
 * @returns The length of the longest dependency chain (0 for empty graph)
 *
 * @internal
 */
function computeMaxChainDepth(depMap: Record<string, readonly string[]>): number {
  const memo = new Map<string, number>();

  function dfs(port: string, visited: Set<string>): number {
    if (visited.has(port)) return 0; // Cycle detected - don't infinite loop
    const cached = memo.get(port);
    if (cached !== undefined) return cached;

    visited.add(port);
    const deps = depMap[port] ?? [];
    let maxDepth = 0;
    for (const dep of deps) {
      maxDepth = Math.max(maxDepth, 1 + dfs(dep, visited));
    }
    visited.delete(port);
    memo.set(port, maxDepth);
    return maxDepth;
  }

  let max = 0;
  for (const port of Object.keys(depMap)) {
    max = Math.max(max, dfs(port, new Set()));
  }
  return max;
}

/**
 * Inspects a built Graph and returns detailed runtime information.
 *
 * This is the companion function to `GraphBuilder.inspect()` for use with
 * already-built graphs. Use this when you need to analyze a graph after
 * calling `build()`.
 *
 * @example Basic usage
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter)
 *   .build();
 *
 * const info = inspectGraph(graph);
 * console.log(info.summary);
 * // "Graph(2 adapters, 0 unsatisfied): Logger (singleton), Database (scoped)"
 * ```
 *
 * @example Checking graph before runtime
 * ```typescript
 * const graph = buildApplicationGraph();
 * const info = inspectGraph(graph);
 *
 * if (info.maxChainDepth > 25) {
 *   console.warn(
 *     `Deep dependency chain (${info.maxChainDepth}). ` +
 *     `Consider splitting into subgraphs.`
 *   );
 * }
 *
 * // Proceed to create runtime container
 * const container = createContainer(graph);
 * ```
 *
 * @param graph - The built graph to inspect (or any graph-like object with adapters and overridePortNames)
 * @returns A frozen GraphInspection object with all inspection data
 */
/**
 * Computes orphan ports - ports that are provided but never required by others.
 *
 * @param providedSet - Set of all provided port names
 * @param allRequires - Set of all required port names
 * @returns Array of orphan port names
 *
 * @internal
 */
function computeOrphanPorts(providedSet: Set<string>, allRequires: Set<string>): string[] {
  return [...providedSet].filter(p => !allRequires.has(p));
}

/**
 * Generates actionable suggestions based on the current graph state.
 *
 * @internal
 */
function generateSuggestions(
  unsatisfiedRequirements: readonly string[],
  orphanPorts: readonly string[],
  maxChainDepth: number,
  dependencyMap: Record<string, readonly string[]>
): GraphSuggestion[] {
  const suggestions: GraphSuggestion[] = [];

  // Suggestions for missing adapters
  for (const portName of unsatisfiedRequirements) {
    // Find which adapters require this port
    const dependents = Object.entries(dependencyMap)
      .filter(([, deps]) => deps.includes(portName))
      .map(([name]) => name);

    suggestions.push({
      type: "missing_adapter",
      portName,
      message: `Port '${portName}' is required by ${dependents.join(", ")} but has no adapter.`,
      action: `Add an adapter that provides '${portName}' using .provide(${portName}Adapter).`,
    });
  }

  // Suggestions for depth warning
  if (maxChainDepth >= DEPTH_WARNING_THRESHOLD) {
    suggestions.push({
      type: "depth_warning",
      portName: "",
      message: `Dependency chain depth (${maxChainDepth}) approaches compile-time limit (30).`,
      action:
        "Consider restructuring to reduce depth, using buildFragment() for deep subgraphs, or splitting into smaller graphs.",
    });
  }

  // Suggestions for orphan ports (only if graph is otherwise complete)
  if (unsatisfiedRequirements.length === 0 && orphanPorts.length > 0) {
    for (const portName of orphanPorts) {
      suggestions.push({
        type: "orphan_port",
        portName,
        message: `Port '${portName}' is provided but not required by any other adapter.`,
        action: `Verify '${portName}' is an intended entry point, or remove the adapter if unused.`,
      });
    }
  }

  return suggestions;
}

export function inspectGraph(graph: InspectableGraph): GraphInspection {
  const provides: string[] = [];
  const allRequires = new Set<string>();
  const providedSet = new Set<string>();
  const dependencyMap: Record<string, string[]> = {};

  for (const adapter of graph.adapters) {
    const portName = adapter.provides.__portName;
    const lifetime = adapter.lifetime;
    provides.push(`${portName} (${lifetime})`);
    providedSet.add(portName);

    const requires: string[] = [];
    for (const req of adapter.requires) {
      requires.push(req.__portName);
      allRequires.add(req.__portName);
    }
    dependencyMap[portName] = requires;
  }

  const unsatisfiedRequirements = [...allRequires].filter(r => !providedSet.has(r));
  const overrides = [...graph.overridePortNames];
  const maxChainDepth = computeMaxChainDepth(dependencyMap);
  const orphanPorts = computeOrphanPorts(providedSet, allRequires);

  const providedNames = [...providedSet].join(", ");
  const missingPart =
    unsatisfiedRequirements.length > 0 ? `. Missing: ${unsatisfiedRequirements.join(", ")}` : "";

  // Generate depth warning if approaching compile-time limit
  const depthWarning =
    maxChainDepth >= DEPTH_WARNING_THRESHOLD
      ? `Warning: Dependency chain depth (${maxChainDepth}) approaches compile-time limit (30). Deep cycles may not be detected at compile time.`
      : undefined;

  // Generate actionable suggestions
  const suggestions = generateSuggestions(
    unsatisfiedRequirements,
    orphanPorts,
    maxChainDepth,
    dependencyMap
  );

  return Object.freeze({
    adapterCount: graph.adapters.length,
    provides,
    unsatisfiedRequirements,
    dependencyMap,
    overrides,
    maxChainDepth,
    depthWarning,
    isComplete: unsatisfiedRequirements.length === 0,
    summary: `Graph(${graph.adapters.length} adapters, ${unsatisfiedRequirements.length} unsatisfied): ${providedNames}${missingPart}`,
    suggestions: Object.freeze(suggestions),
    orphanPorts: Object.freeze(orphanPorts),
  });
}

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
 * @internal
 */
function escapeLabel(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
