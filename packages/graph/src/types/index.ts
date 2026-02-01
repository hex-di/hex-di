/**
 * Shared utility types for @hex-di/graph.
 *
 * This module re-exports common utility types from @hex-di/core for internal use.
 * Domain-specific types are co-located with their implementations:
 *
 * - `../builder/types/` - Builder types
 * - `../graph/types/` - Graph types
 * - `../validation/types/` - Validation types
 *
 * @packageDocumentation
 */

// Common utility types (from @hex-di/core)
export type { IsNever, TupleToUnion, Prettify, InferenceError } from "@hex-di/core";
