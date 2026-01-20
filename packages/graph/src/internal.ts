/**
 * @hex-di/graph/internal - Internal Types for Advanced Users
 *
 * This module exports types marked as `@internal` in the main package.
 * These types are implementation details that may change between versions
 * without notice, but are made available for:
 *
 * - Library authors building on top of @hex-di/graph
 * - Advanced type-level programming
 * - Debugging and inspection utilities
 * - Custom validation tooling
 *
 * ## Stability Warning
 *
 * **These types are NOT covered by semver guarantees.**
 * Use at your own risk - breaking changes may occur in minor/patch releases.
 *
 * ## Import
 *
 * ```typescript
 * import type { ProvideResult, InferAdapterProvides } from "@hex-di/graph/internal";
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Common Utilities
// =============================================================================

export type { IsNever, TupleToUnion, Prettify, InferenceError } from "./common/index.js";

// =============================================================================
// Adapter Inference Types
// =============================================================================

export type {
  InferAdapterProvides,
  InferAdapterRequires,
  InferManyProvides,
  InferManyRequires,
  InferManyAsyncPorts,
  InferAdapterLifetime,
} from "./adapter/inference.js";

// =============================================================================
// Validation Logic Types
// =============================================================================

export type {
  UnsatisfiedDependencies,
  IsSatisfied,
  OverlappingPorts,
  HasOverlap,
} from "./validation/logic.js";

// =============================================================================
// Error Types
// =============================================================================

export type { ExtractPortNames, MissingDependencyError } from "./validation/errors.js";

// =============================================================================
// Cycle Detection Internals
// =============================================================================

export type {
  DefaultMaxDepth,
  ValidateMaxDepth,
  AdapterProvidesName,
  AdapterRequiresNames,
  AddEdge,
  GetDirectDeps,
  IsReachable,
  WouldCreateCycle,
  FindCyclePath,
  BuildCyclePath,
  CircularDependencyError,
  MergeDependencyMaps,
  AddManyEdges,
  WouldAnyCreateCycle,
  DetectCycleInMergedGraph,
} from "./validation/cycle-detection.js";

// =============================================================================
// Builder Internal Types
// =============================================================================
//
// Note: The following builder types are not exported because they reference
// private type parameters that are internal to GraphBuilder:
//
// - DirectAdapterLifetime
// - ProvideResult
// - ProvideAsyncResult
// - BatchHasOverlap
// - ProvideManyResult
// - MergeResult
// - MergeResultAfterLifetimeCheck
// - MergeResultAfterCycleCheck
// - EmptyDependencyGraph
// - EmptyLifetimeMap
//
// These are true implementation details that would be meaningless outside
// the GraphBuilder context.
