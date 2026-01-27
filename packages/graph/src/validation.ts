/**
 * @hex-di/graph/validation - Validation Types and Utilities
 *
 * This module exports all validation-related types and runtime utilities.
 * Use this for:
 * - Advanced type-level programming with validation types
 * - Error parsing and handling
 * - Building custom validation logic
 *
 * @packageDocumentation
 */

// =============================================================================
// Error Types
// =============================================================================

export type { MissingDependencyError, DuplicateProviderError } from "./validation/types/errors.js";

// =============================================================================
// Error Parsing (Runtime)
// =============================================================================

export {
  GraphErrorNumericCode,
  GraphErrorCode,
  isGraphError,
  parseGraphError,
} from "./validation/error-parsing.js";

export type {
  GraphErrorNumericCodeType,
  GraphErrorCodeType,
  ParsedGraphError,
} from "./validation/error-parsing.js";

// =============================================================================
// Cycle Detection Types
// =============================================================================

export type {
  DefaultMaxDepth,
  ValidateMaxDepth,
  WouldCreateCycle,
  Depth,
  IncrementDepth,
  DepthExceeded,
  AdapterProvidesName,
  AdapterRequiresNames,
  AddEdge,
  GetDirectDeps,
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
  CircularDependencyError,
} from "./validation/types/cycle/index.js";

// Circular error message builder from error-messages module
export type { CircularErrorMessage } from "./validation/types/error-messages.js";

// =============================================================================
// Captive Dependency Types
// =============================================================================

export type {
  LifetimeLevel,
  LifetimeName,
  IsCaptiveDependency,
  AddLifetime,
  GetLifetimeLevel,
  MergeLifetimeMaps,
  FindAnyCaptiveDependency,
  AddManyLifetimes,
  WouldAnyBeCaptive,
  DetectCaptiveInMergedGraph,
  FindLifetimeInconsistency,
} from "./validation/types/captive/index.js";

// =============================================================================
// Dependency Satisfaction Types
// =============================================================================

export type {
  UnsatisfiedDependencies,
  IsSatisfied,
  OverlappingPorts,
  HasOverlap,
  ValidGraph,
  NewlySatisfiedDependencies,
  MergeSatisfiesDependencies,
  OrphanPorts,
} from "./validation/types/dependency-satisfaction.js";

// Port name joining utilities (for error message construction)
export type { JoinPortNames } from "./validation/types/error-messages.js";

// =============================================================================
// Lazy Transform Types
// =============================================================================

export type {
  TransformLazyToOriginal,
  ExtractLazyPorts,
  HasLazyPorts,
} from "./validation/types/lazy-transforms.js";

// =============================================================================
// Batch Duplicate Detection
// =============================================================================

export type {
  HasDuplicatesInBatch,
  FindBatchDuplicate,
  BatchDuplicateErrorMessage,
} from "./validation/types/batch-duplicates.js";

// =============================================================================
// Async Detection
// =============================================================================

export type { IsAsyncAdapter } from "./validation/types/init-priority.js";
