/**
 * @hex-di/graph/advanced - Power User & Internal Exports
 *
 * This module exports all utilities for power users who need:
 * - Graph validation and inspection
 * - Error parsing and debugging
 * - Traversal utilities
 * - Structured logging
 * - Debug types for troubleshooting
 * - Internal types for library authors
 *
 * For basic usage, import from "@hex-di/graph" instead.
 *
 * ## Stability Warning
 *
 * Types marked with `Debug*` prefix are NOT covered by semver guarantees.
 * Use at your own risk - breaking changes may occur in minor/patch releases.
 *
 * @packageDocumentation
 */

// =============================================================================
// Re-export Everything from Main Module
// =============================================================================

export * from "./index.js";

// =============================================================================
// Inspection Utilities (Runtime)
// =============================================================================

export {
  inspectGraph,
  inspectionToJSON,
  detectCycleAtRuntime,
  detectCaptiveAtRuntime,
  detectAllCaptivesAtRuntime,
  computeTypeComplexity,
  filterPorts,
  getInboundPorts,
  getOutboundPorts,
  getPortsByCategory,
  getPortsByTags,
} from "./graph/inspection/index.js";
export type {
  CaptiveDependencyResult,
  ComplexityBreakdown,
  PortFilter,
  FilteredPorts,
} from "./graph/inspection/index.js";
export { INSPECTION_CONFIG } from "./graph/inspection/complexity.js";
export type { InspectOptions } from "./graph/inspection/inspector.js";

// =============================================================================
// Inspection Types
// =============================================================================

export type {
  GraphInspection,
  GraphSuggestion,
  ValidationResult,
  GraphInspectionJSON,
  InspectionToJSONOptions,
  PortInfo,
  DirectionSummary,
  PortDirection,
} from "./graph/types/inspection.js";

// =============================================================================
// Graph Traversal Utilities
// =============================================================================

export type { DependencyMap } from "./graph/inspection/traversal.js";
export {
  buildDependencyMap,
  topologicalSort,
  getTransitiveDependencies,
  getTransitiveDependents,
  findDependencyPath,
  findCommonDependencies,
  computeDependencyLayers,
  getPortsByLayer,
} from "./graph/inspection/traversal.js";

// =============================================================================
// Error Formatting (Runtime)
// =============================================================================

export {
  formatCycleError,
  formatMissingDepsError,
  formatCaptiveError,
  formatDuplicateError,
} from "./graph/inspection/error-formatting.js";

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
  // Error detail types for discriminated union narrowing
  DuplicateAdapterDetails,
  CircularDependencyDetails,
  CaptiveDependencyDetails,
  ReverseCaptiveDependencyDetails,
  LifetimeInconsistencyDetails,
  SelfDependencyDetails,
  DepthLimitExceededDetails,
  MissingDependencyDetails,
  OverrideWithoutParentDetails,
  MissingProvidesDetails,
  InvalidProvidesDetails,
  InvalidRequiresTypeDetails,
  InvalidRequiresElementDetails,
  InvalidLifetimeTypeDetails,
  InvalidLifetimeValueDetails,
  InvalidFactoryDetails,
  DuplicateRequiresDetails,
  InvalidFinalizerDetails,
  InvalidLazyPortDetails,
  MultipleErrorsDetails,
  UnknownErrorDetails,
  // Parsed error types for discriminated unions
  ParsedDuplicateAdapterError,
  ParsedCircularDependencyError,
  ParsedCaptiveDependencyError,
  ParsedReverseCaptiveDependencyError,
  ParsedLifetimeInconsistencyError,
  ParsedSelfDependencyError,
  ParsedDepthLimitExceededError,
  ParsedMissingDependencyError,
  ParsedOverrideWithoutParentError,
  ParsedMissingProvidesError,
  ParsedInvalidProvidesError,
  ParsedInvalidRequiresTypeError,
  ParsedInvalidRequiresElementError,
  ParsedInvalidLifetimeTypeError,
  ParsedInvalidLifetimeValueError,
  ParsedInvalidFactoryError,
  ParsedDuplicateRequiresError,
  ParsedInvalidFinalizerError,
  ParsedInvalidLazyPortError,
  ParsedMultipleErrorsError,
  ParsedUnknownErrorError,
} from "./validation/error-parsing.js";

// =============================================================================
// Structured Logging
// =============================================================================

export { toStructuredLogs } from "./graph/inspection/structured-logging.js";
export type {
  LogLevel,
  StructuredLogEntry,
  StructuredLogOptions,
} from "./graph/inspection/structured-logging.js";

// =============================================================================
// Compile-time Error Types
// =============================================================================

export type { MissingDependencyError, DuplicateProviderError } from "./validation/types/errors.js";
export type { CircularDependencyError } from "./validation/types/cycle/errors.js";
export type { CaptiveDependencyError } from "./validation/types/captive/errors.js";

// =============================================================================
// Validation Types (for type-level programming)
// =============================================================================

export type {
  // Cycle detection
  DefaultMaxDepth,
  ValidateMaxDepth,
  WouldCreateCycle,
  CircularErrorMessage,
  // Depth limit messages
  DepthLimitError,
  DepthLimitWarning,
  // Captive dependency detection
  LifetimeLevel,
  IsCaptiveDependency,
  // Dependency satisfaction
  UnsatisfiedDependencies,
  OrphanPorts,
  JoinPortNames,
  // Lazy transforms
  TransformLazyToOriginal,
  ExtractLazyPorts,
  HasLazyPorts,
} from "./validation/types/index.js";

// =============================================================================
// Builder State Types (for advanced patterns)
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
  ProvideResult,
  ProvideResultAllErrors,
  ProvideAsyncResult,
  ProvideManyResult,
  ProvideUncheckedResult,
  MergeResult,
  MergeWithResult,
  OverrideResult,
  PrettyBuilder,
} from "./builder/types/index.js";

// =============================================================================
// Batch Duplicate Detection
// =============================================================================

export type {
  HasDuplicatesInBatch,
  FindBatchDuplicate,
  BatchDuplicateErrorMessage,
} from "./validation/types/batch-duplicates.js";

// =============================================================================
// Debug Types (for troubleshooting type-level validation)
// =============================================================================

export type {
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
// Lazy Port Types (re-exported from core for convenience)
// =============================================================================

export type { IsLazyPort, UnwrapLazyPort } from "@hex-di/core";
export { getOriginalPort } from "@hex-di/core";

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
// Builder Inspection Types
// =============================================================================

export type {
  SimplifiedView,
  InferBuilderProvides,
  InferBuilderUnsatisfied,
  DebugBuilderInternals,
} from "./builder/types/inspection.js";

export type { MergeOptions, ResolveMaxDepth } from "./builder/types/merge.js";

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
// Async Detection
// =============================================================================

export type { IsAsyncAdapter } from "./validation/types/init-priority.js";

// =============================================================================
// Debug Utilities
// =============================================================================

export type {
  DebugWouldCreateCycle,
  DebugIsReachable,
  DebugDepthExceeded,
  DebugValidationPipeline,
} from "./validation/types/debug/index.js";
