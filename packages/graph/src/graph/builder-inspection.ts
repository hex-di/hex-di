/**
 * Runtime inspection utilities for dependency graphs.
 *
 * ## Module Structure
 *
 * This module re-exports inspection utilities from the `./inspection/` submodule.
 * The indirection exists for several reasons:
 *
 * 1. **Import Path Flexibility**: Users can import via either:
 *    - `@hex-di/graph` (primary API)
 *    - `@hex-di/graph` internal graph module
 *
 * 2. **Backwards Compatibility**: This re-export point allows the internal
 *    structure of inspection utilities to be reorganized without changing
 *    the public API.
 *
 * 3. **Code Organization**: The `./inspection/` submodule contains:
 *    - `inspect-graph.ts` - Graph inspection logic
 *    - `inspect-types.ts` - Inspection type definitions
 *    - `index.ts` - Barrel file for internal exports
 *
 * ## Usage
 *
 * ```typescript
 * import { inspectGraph, type InspectableGraph } from "@hex-di/graph";
 *
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .build();
 *
 * const inspection = inspectGraph(graph);
 * console.log(inspection.adapterCount); // 1
 * ```
 *
 * ## Visualization
 *
 * Visualization utilities (toDotGraph, toMermaidGraph) have been moved
 * to the separate `@hex-di/visualization` package:
 *
 * ```typescript
 * import { toDotGraph, toMermaidGraph } from "@hex-di/visualization";
 * ```
 *
 * @see ./inspection/index.ts - Internal inspection module
 * @see @hex-di/visualization - Graph visualization utilities
 *
 * @packageDocumentation
 */

// Re-export all inspection utilities from the focused submodule
export * from "./inspection/index.js";
