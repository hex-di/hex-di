/**
 * @hex-di/graph - Dependency Graph Construction and Validation
 *
 * The compile-time validation layer of HexDI.
 * Provides type-safe dependency injection with actionable compile-time errors.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { port, createAdapter } from "@hex-di/core";
 *
 * // Define ports
 * const LoggerPort = createPort<"Logger", Logger>("Logger");
 *
 * // Create adapters
 * const loggerAdapter = createAdapter({
 *   provides: LoggerPort,
 *   requires: [],
 *   lifetime: "singleton",
 *   factory: () => new ConsoleLogger(),
 * });
 *
 * // Build graph
 * const graph = GraphBuilder.create()
 *   .provide(loggerAdapter)
 *   .build();
 * ```
 *
 * ## Export Tiers
 *
 * - **Primary** (`@hex-di/graph`): Core graph building and inference
 * - **Advanced** (`@hex-di/graph/advanced`): Validation, inspection, error parsing
 * - **Internal** (`@hex-di/graph/internal`): Library authors, debugging, unstable API
 *
 * Note: Ports, adapters, and errors are now in `@hex-di/core`.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Graph Building
// =============================================================================

export { GraphBuilder, GRAPH_BUILDER_BRAND } from "./builder/builder.js";
export type { GraphBuilderFactory } from "./builder/builder.js";
export type { Graph } from "./graph/types/graph-types.js";

// =============================================================================
// Type Guards (Runtime)
// =============================================================================

export { isGraphBuilder } from "./builder/guards.js";
export { isGraph } from "./graph/guards.js";

// =============================================================================
// Graph Inference Types
// =============================================================================

export type {
  InferGraphProvides,
  InferGraphRequires,
  InferGraphAsyncPorts,
  InferGraphOverrides,
} from "./graph/types/graph-inference.js";

// =============================================================================
// Pretty View Symbol (for IDE type display)
// =============================================================================

export type { __prettyViewSymbol } from "./symbols/index.js";
