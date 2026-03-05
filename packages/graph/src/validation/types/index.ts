/**
 * Validation module - Compile-time graph validation types.
 *
 * This module exports types for compile-time validation of dependency graphs:
 *
 * - **Error types**: Branded error messages for duplicates, cycles, captive deps
 * - **Cycle detection**: Type-level cycle detection in dependency graphs
 * - **Captive detection**: Detection of lifetime scope violations
 * - **Lazy transforms**: Utilities for lazy port handling
 *
 * All validation happens at compile-time via TypeScript's type system.
 *
 * @packageDocumentation
 */

export * from "./errors.js";
export * from "./dependency-satisfaction.js";

// Canonical adapter port name extraction utilities (used by cycle, captive, self-dependency)
export type {
  AdapterProvidesName,
  AdapterRequiresNames,
  // Branded variants for nominal typing
  BrandedPortName,
  IsBrandedPortName,
  BrandedAdapterProvidesName,
  BrandedAdapterRequiresNames,
} from "./adapter-extraction.js";

// Explicit exports from batch-duplicates.ts
export type {
  HasDuplicatesInBatch,
  FindBatchDuplicate,
  BatchDuplicateErrorMessage,
} from "./batch-duplicates.js";

// Explicit exports from lazy-transforms.ts
export type {
  TransformLazyToOriginal,
  ExtractLazyPorts,
  HasLazyPorts,
  TransformLazyPortNamesToOriginal,
} from "./lazy-transforms.js";

// Cycle detection types (from cycle/ subdirectory)
export type {
  // Depth utilities
  DefaultMaxDepth,
  ValidateMaxDepth,
  Depth,
  IncrementDepth,
  DepthExceeded,
  // Number comparison utilities (for merge maxDepth resolution)
  CompareNumbers,
  MaxNumber,
  MinNumber,
  // Dependency map operations
  AddEdge,
  GetDirectDeps,
  MergeDependencyMaps,
  AddManyEdges,
  DebugGetDirectDeps,
  // Core reachability algorithm
  IsReachable,
  WouldCreateCycle,
  WouldExceedDepthLimit,
  // Depth exceeded result types
  DepthExceededResult,
  IsDepthExceeded,
  ExtractDepthExceededPort,
  // Cycle path extraction
  FindCyclePath,
  BuildCyclePath,
  CircularDependencyError,
  // Lazy suggestions for cycle errors
  FormatLazySuggestion,
  LazySuggestions,
  FormatLazySuggestionMessage,
  // Batch and merge utilities
  WouldAnyCreateCycle,
  DetectCycleInMergedGraph,
} from "./cycle/index.js";

// Captive dependency detection types (from captive/ subdirectory)
export type {
  // Lifetime level constants
  SINGLETON_LEVEL,
  SCOPED_LEVEL,
  TRANSIENT_LEVEL,
  LifetimeLevelValue,
  // Lifetime level utilities
  LifetimeLevel,
  LifetimeName,
  // Lifetime map operations
  AddLifetime,
  GetLifetimeLevel,
  MergeLifetimeMaps,
  // Comparison utilities
  IsCaptiveDependency,
  // Error types
  CaptiveDependencyError,
  ReverseCaptiveDependencyError,
  MalformedAdapterError,
  // Detection utilities
  FindAnyCaptiveDependency,
  FindReverseCaptiveDependency,
  AddManyLifetimes,
  WouldAnyBeCaptive,
  WouldAnyCreateReverseCaptive,
  DebugCaptiveCheck,
  // Merge utilities
  DetectCaptiveInMergedGraph,
  FindLifetimeInconsistency,
} from "./captive/index.js";

// Async adapter utility type
export type { IsAsyncAdapter } from "./init-priority.js";

// Self-dependency detection
export type {
  HasSelfDependency,
  HasSelfDependencyInBatch,
  FindSelfDependencyPort,
} from "./self-dependency.js";

// Merge conflict detection
export type {
  CommonKeys,
  StringUnionEqual,
  MergeConflictError,
  MergeConflictErrorMessage,
  DetectMergeConflict,
} from "./merge-conflict.js";

// Initialization order (topological sort)
export type { InitializationOrder } from "./init-order.js";
