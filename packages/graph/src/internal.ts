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
 * import type { DebugProvideValidation } from "@hex-di/graph/internal";
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Re-export Everything from Main Module
// =============================================================================
//
// The internal module re-exports everything from the main module plus
// additional internal types. This ensures users don't need to maintain
// two import sources.

export * from "./index.js";

// =============================================================================
// Debug Types (for troubleshooting type-level validation)
// =============================================================================

export type {
  // Builder inspection debug types
  DebugProvideValidation,
  DebugAdapterInference,
  ProvideValidationTrace,
  DebugBuilderState,
  DebugSimplifiedView,
  DebugInspectableBuilder,
  DebugMergeValidation,
  DebugProvideResult,
  DebugOverrideValidation,
} from "./builder/types/inspection.js";

// Adapter inference debug types
export type {
  DebugInferAdapterProvides,
  DebugInferAdapterRequires,
  DebugInferAdapterLifetime,
  DebugInferManyProvides,
  DebugInferManyRequires,
} from "./adapter/types/adapter-inference.js";

// Graph inference debug types
export type {
  DebugInferGraphProvides,
  DebugInferGraphRequires,
  DebugInferGraphAsyncPorts,
  DebugInferGraphOverrides,
} from "./graph/types/graph-inference.js";

// =============================================================================
// Builder Internals (for advanced type-level programming)
// =============================================================================

export type {
  GetDepGraph,
  GetLifetimeMap,
  GetParentProvides,
  GetMaxDepth,
  GetUnsafeDepthOverride,
} from "./builder/types/state.js";

// =============================================================================
// Lazy Port Types (for type-level lazy handling)
// =============================================================================

export type { IsLazyPort, UnwrapLazyPort } from "./adapter/lazy.js";
export { getOriginalPort } from "./adapter/lazy.js";

// =============================================================================
// Validation Types (for type-level validation)
// =============================================================================

export type { FilterNever, MultiErrorMessage } from "./validation/types/error-aggregation.js";

export type {
  IsSatisfied,
  HasOverlap,
  ValidGraph,
} from "./validation/types/dependency-satisfaction.js";

export type {
  ExtractPortNames,
  DuplicateErrorMessage,
  CaptiveErrorMessage,
} from "./validation/types/error-messages.js";

// =============================================================================
// Builder Types (for type-level builder inspection)
// =============================================================================

export type {
  SimplifiedView,
  InferBuilderProvides,
  InferBuilderUnsatisfied,
  DebugBuilderInternals,
} from "./builder/types/inspection.js";

export type { MergeOptions, ResolveMaxDepth } from "./builder/types/merge.js";

// =============================================================================
// Cycle Detection Internals (for custom validation tooling)
// =============================================================================

export type {
  Depth,
  IncrementDepth,
  DepthExceeded,
  DepthExceededResult,
  IsDepthExceeded,
  ExtractDepthExceededPort,
  AdapterProvidesName,
  AdapterRequiresNames,
  AddEdge,
  GetDirectDeps,
  DebugGetDirectDeps,
  MergeDependencyMaps,
  AddManyEdges,
  IsReachable,
  WouldExceedDepthLimit,
  FindCyclePath,
  BuildCyclePath,
  FormatLazySuggestion,
  LazySuggestions,
  WouldAnyCreateCycle,
  DetectCycleInMergedGraph,
  CompareNumbers,
  MaxNumber,
  MinNumber,
} from "./validation/types/cycle/index.js";

// =============================================================================
// Captive Detection Internals (for custom validation tooling)
// =============================================================================

export type {
  LifetimeName,
  AddLifetime,
  GetLifetimeLevel,
  MergeLifetimeMaps,
  FindAnyCaptiveDependency,
  AddManyLifetimes,
  WouldAnyBeCaptive,
  DetectCaptiveInMergedGraph,
  FindLifetimeInconsistency,
  FindReverseCaptiveDependency,
  MalformedAdapterError,
  DebugCaptiveCheck,
} from "./validation/types/captive/index.js";

// =============================================================================
// Async Detection (for custom initialization patterns)
// =============================================================================

export type { IsAsyncAdapter } from "./validation/types/init-priority.js";
