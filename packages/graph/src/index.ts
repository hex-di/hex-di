/**
 * @hex-di/graph - Dependency Graph Construction and Validation
 *
 * The compile-time validation layer of HexDI.
 * Provides Adapter type, createAdapter function, and GraphBuilder
 * with type-level dependency tracking that produces actionable
 * compile-time error messages when the graph is incomplete.
 *
 * @packageDocumentation
 */

// Re-export types from @hex-di/ports for consumer convenience
export type { Port, InferService, InferPortName } from "@hex-di/ports";

// Export everything from the new modular structure
export * from "./validation/index.js";
export * from "./adapter/index.js";
export * from "./graph/index.js";

// Export runtime type guards
export { isLifetime, isFactoryKind, isAdapter, isGraphBuilder, isGraph } from "./guards.js";

// Export utility types from common
export type { IsNever, TupleToUnion, Prettify } from "./common/index.js";
