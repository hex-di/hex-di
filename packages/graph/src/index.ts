/**
 * @hex-di/graph - Dependency Graph Construction and Validation
 *
 * The compile-time validation layer of HexDI.
 * Provides type-safe dependency injection with actionable compile-time errors.
 *
 * ## API Stability Tiers
 *
 * | Tier | Import Path | Stability | Policy |
 * |------|-------------|-----------|--------|
 * | Primary | `@hex-di/graph` | Stable | Semver-protected; breaking changes require major version bump |
 * | Advanced | `@hex-di/graph/advanced` | Stable | Semver-protected; additions may occur in minor versions |
 * | Internal | `@hex-di/graph/internal` | Unstable | May change without notice in any version; not for external consumption |
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
// Result-based Build API
// =============================================================================

export type {
  GraphBuildError,
  GraphValidationError,
  CyclicDependencyBuildError,
  CaptiveDependencyBuildError,
  MissingDependencyBuildError,
} from "./errors/index.js";

export { isGraphBuildError } from "./errors/index.js";
export { GraphBuildException } from "./errors/index.js";

// =============================================================================
// Pretty View Symbol (for IDE type display)
// =============================================================================

export type { __prettyViewSymbol } from "./symbols/index.js";
