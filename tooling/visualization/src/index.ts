/**
 * @hex-di/visualization - Graph Visualization Utilities for HexDI
 *
 * This package provides utilities for exporting dependency graphs to various
 * visualization formats like DOT (Graphviz) and Mermaid.
 *
 * ## Why a Separate Package?
 *
 * Visualization is a **presentation concern** that doesn't belong in the core
 * graph validation layer. By extracting it to a separate package:
 *
 * - The core `@hex-di/graph` package stays focused on construction and validation
 * - Users who don't need visualization don't pay for it (smaller bundle)
 * - Visualization can evolve independently with its own dependencies
 *
 * ## Usage
 *
 * ```typescript
 * import { GraphBuilder, inspectGraph } from "@hex-di/graph";
 * import { toDotGraph, toMermaidGraph } from "@hex-di/visualization";
 *
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter)
 *   .build();
 *
 * // Export to Graphviz DOT format
 * const dot = toDotGraph(inspectGraph(graph));
 *
 * // Export to Mermaid format
 * const mermaid = toMermaidGraph(inspectGraph(graph));
 * ```
 *
 * @packageDocumentation
 */

export { toDotGraph, toMermaidGraph } from "./visualization.js";
export type { DotGraphOptions, MermaidGraphOptions } from "./visualization.js";
