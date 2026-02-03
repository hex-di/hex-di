/**
 * @hex-di/graph/internal - Internal Types for Library Authors
 *
 * **WARNING: This module is NOT covered by semver guarantees.**
 * Breaking changes may occur in minor or patch releases.
 *
 * This module exports internal types intended for:
 * - Library authors building on top of @hex-di/graph
 * - Advanced debugging and introspection
 * - Type-level programming internals
 *
 * For stable APIs, use:
 * - "@hex-di/graph" for basic graph building
 * - "@hex-di/graph/advanced" for power user features
 * - "@hex-di/graph/inspection" for runtime inspection
 *
 * @packageDocumentation
 */

// =============================================================================
// Debug Types (for troubleshooting type-level validation)
// =============================================================================

export type {
  DebugAdapterInference,
  ProvideValidationTrace,
  DebugBuilderState,
  DebugSimplifiedView,
  DebugInspectableBuilder,
  DebugOverrideValidation,
} from "./builder/types/inspection.js";

export type {
  DebugProvideValidation,
  DebugMergeValidation,
  DebugProvideResult,
} from "./builder/types/inspection-debug.js";

export type {
  DebugInferGraphProvides,
  DebugInferGraphRequires,
  DebugInferGraphAsyncPorts,
  DebugInferGraphOverrides,
} from "./graph/types/graph-inference.js";

export type {
  DebugWouldCreateCycle,
  DebugIsReachable,
  DebugDepthExceeded,
  DebugValidationPipeline,
} from "./validation/types/debug/index.js";

// =============================================================================
// Builder State Internals
// =============================================================================

export { __emptyDepGraphBrand, __emptyLifetimeMapBrand } from "./builder/types/index.js";

export type {
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  AnyBuilderInternals,
  BuilderInternals,
  DefaultInternals,
  GetDepthExceededWarning,
} from "./builder/types/index.js";

export type {
  GetDepGraph,
  GetLifetimeMap,
  GetParentProvides,
  GetMaxDepth,
  GetExtendedDepth,
} from "./builder/types/state.js";

export type {
  SimplifiedView,
  InferBuilderProvides,
  InferBuilderUnsatisfied,
  DebugBuilderInternals,
} from "./builder/types/inspection.js";

export type { MergeOptions, ResolveMaxDepth } from "./builder/types/merge.js";

// =============================================================================
// Batch Duplicate Detection Internals
// =============================================================================

export type {
  HasDuplicatesInBatch,
  FindBatchDuplicate,
  BatchDuplicateErrorMessage,
} from "./validation/types/batch-duplicates.js";

// =============================================================================
// Validation Internals
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
// Cycle Detection Internals
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
// Captive Detection Internals
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
// Provide/Merge Result Types
// =============================================================================

export type {
  ProvideResult,
  ProvideResultAllErrors,
  ProvideManyResult,
  MergeResult,
  OverrideResult,
  PrettyBuilder,
} from "./builder/types/index.js";
