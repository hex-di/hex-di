/**
 * @hex-di/graph/types - Public Type Exports
 *
 * This module exports all public types for users who want to work with
 * HexDI types without importing runtime code. Useful for:
 * - Type-only imports in declaration files
 * - Reducing bundle size in type-heavy applications
 * - Building type utilities on top of HexDI
 *
 * @packageDocumentation
 */

// =============================================================================
// Port Types (from @hex-di/ports)
// =============================================================================

export type { Port, InferService, InferPortName } from "@hex-di/ports";

// =============================================================================
// Adapter Types
// =============================================================================

export type {
  Adapter,
  AdapterConstraint,
  Lifetime,
  FactoryKind,
  ResolvedDeps,
} from "./adapter/types/adapter-types.js";

export type {
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  InferManyProvides,
  InferManyRequires,
  InferManyAsyncPorts,
  InferClonable,
  IsClonableAdapter,
} from "./adapter/types/adapter-inference.js";

export type { LazyPort } from "./adapter/lazy.js";

// =============================================================================
// Graph Types
// =============================================================================

export type { Graph } from "./graph/types/graph-types.js";

export type {
  InferGraphProvides,
  InferGraphRequires,
  InferGraphAsyncPorts,
  InferGraphOverrides,
} from "./graph/types/graph-inference.js";

// =============================================================================
// Inspection Types
// =============================================================================

export type {
  GraphInspection,
  GraphSuggestion,
  ValidationResult,
  GraphInspectionJSON,
  InspectionToJSONOptions,
} from "./graph/types/inspection.js";

export type { InspectOptions } from "./graph/inspection/inspector.js";
export type { DependencyMap } from "./graph/inspection/traversal.js";

export type {
  LogLevel,
  StructuredLogEntry,
  StructuredLogOptions,
} from "./graph/inspection/structured-logging.js";

// =============================================================================
// Error Types
// =============================================================================

export type { MissingDependencyError, DuplicateProviderError } from "./validation/types/errors.js";

export type {
  GraphErrorNumericCodeType,
  GraphErrorCodeType,
  ParsedGraphError,
} from "./validation/error-parsing.js";

// =============================================================================
// Builder Types
// =============================================================================

export type { GraphBuilderFactory } from "./builder/builder.js";
export type { __prettyViewSymbol } from "./symbols/index.js";

export type {
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  AnyBuilderInternals,
  BuilderInternals,
  DefaultInternals,
  ProvideResult,
  ProvideResultAllErrors,
  ProvideAsyncResult,
  ProvideManyResult,
  ProvideUncheckedResult,
  MergeResult,
  MergeWithResult,
  OverrideResult,
  PrettyBuilder,
  InvalidOverrideErrorMessage,
  InvalidOverrideErrorWithAvailable,
  IsValidOverride,
  OverridablePorts,
} from "./builder/types/index.js";

// =============================================================================
// Validation Types
// =============================================================================

// Cycle detection types
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

// Captive dependency types
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
  CaptiveDependencyError,
} from "./validation/types/captive/index.js";

// Dependency satisfaction types
export type { UnsatisfiedDependencies } from "./validation/types/dependency-satisfaction.js";

// Error message construction
export type { JoinPortNames, CircularErrorMessage } from "./validation/types/error-messages.js";

// Lazy transforms
export type {
  TransformLazyToOriginal,
  ExtractLazyPorts,
  HasLazyPorts,
} from "./validation/types/lazy-transforms.js";

// Batch duplicate detection
export type {
  HasDuplicatesInBatch,
  FindBatchDuplicate,
  BatchDuplicateErrorMessage,
} from "./validation/types/batch-duplicates.js";

// Async detection
export type { IsAsyncAdapter } from "./validation/types/init-priority.js";

// =============================================================================
// Utility Types
// =============================================================================

export type { IsNever, TupleToUnion, Prettify } from "./types/type-utilities.js";
