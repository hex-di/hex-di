/**
 * Shared utility types for @hex-di/graph.
 *
 * This module exports ONLY shared utility types used across all domains.
 * Domain-specific types are co-located with their implementations:
 *
 * - `../adapter/types/` - Adapter types
 * - `../builder/types/` - Builder types
 * - `../graph/types/` - Graph types
 * - `../validation/types/` - Validation types
 *
 * Import directly from the specific domain barrel to avoid implicit coupling.
 *
 * @packageDocumentation
 */

// Common utility types (shared across all domains)
export type { IsNever, TupleToUnion, Prettify, InferenceError } from "./type-utilities.js";
