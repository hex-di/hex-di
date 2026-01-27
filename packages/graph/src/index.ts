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

// =============================================================================
// Re-exports from @hex-di/ports (for consumer convenience)
// =============================================================================

export type { Port, InferService, InferPortName } from "@hex-di/ports";

// =============================================================================
// Core Graph Building
// =============================================================================

export { GraphBuilder, GRAPH_BUILDER_BRAND } from "./builder/builder.js";
export type { __prettyViewSymbol } from "./symbols/index.js";
export type { GraphBuilderFactory } from "./builder/builder.js";
export type { Graph } from "./graph/types/graph-types.js";

// =============================================================================
// Adapter Creation
// =============================================================================

export { createAdapter, createAsyncAdapter } from "./adapter/factory.js";
export { defineService, defineAsyncService, createClassAdapter } from "./adapter/service.js";

// =============================================================================
// Lazy Port Support
// =============================================================================

export { lazyPort, isLazyPort } from "./adapter/lazy.js";
export type { LazyPort } from "./adapter/lazy.js";

// =============================================================================
// Core Types
// =============================================================================

export type {
  Adapter,
  AdapterConstraint,
  Lifetime,
  FactoryKind,
  ResolvedDeps,
  EmptyDeps,
} from "./adapter/types/adapter-types.js";

// =============================================================================
// Type Guards (Runtime)
// =============================================================================

export { isLifetime, isFactoryKind, isAdapter } from "./adapter/guards.js";
export { isGraphBuilder } from "./builder/guards.js";
export { isGraph } from "./graph/guards.js";

// =============================================================================
// Adapter Inference Types
// =============================================================================

export type {
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
} from "./adapter/types/adapter-inference.js";

// =============================================================================
// Graph Inference Types
// =============================================================================

export type {
  InferGraphProvides,
  InferGraphRequires,
  InferGraphAsyncPorts,
  InferGraphOverrides,
} from "./graph/types/graph-inference.js";

// =============================================================================
// Error Types (Compile-time Error Messages)
// =============================================================================

export type { MissingDependencyError, DuplicateProviderError } from "./validation/types/errors.js";

export type { CircularDependencyError } from "./validation/types/cycle/errors.js";
export type { CaptiveDependencyError } from "./validation/types/captive/errors.js";

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

export {
  inspectGraph,
  inspectionToJSON,
  detectCycleAtRuntime,
  detectCaptiveAtRuntime,
  detectAllCaptivesAtRuntime,
  computeTypeComplexity,
} from "./graph/inspection/index.js";
export type { CaptiveDependencyResult, ComplexityBreakdown } from "./graph/inspection/index.js";
export { INSPECTION_CONFIG } from "./graph/inspection/complexity.js";
export type { InspectOptions } from "./graph/inspection/inspector.js";

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
// Utility Types (commonly needed)
// =============================================================================

export type { IsNever, TupleToUnion, Prettify } from "./types/type-utilities.js";

// =============================================================================
// Validation Types (for advanced type-level programming)
// =============================================================================

// These are useful for advanced users who need to work with the type-level
// validation system directly. For internal implementation details, see
// the internal.ts module.

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

// Re-export empty state brand symbols (for type-level usage)
export { __emptyDepGraphBrand, __emptyLifetimeMapBrand } from "./builder/types/index.js";

export type {
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  AnyBuilderInternals,
  BuilderInternals,
  DefaultInternals,
  GetDepthExceededWarning,
} from "./builder/types/index.js";

// Re-export provide/merge result types for advanced pattern matching
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
// Advanced User Types (for type-level programming)
// =============================================================================
//
// For additional internal types like Depth, IncrementDepth, AddEdge, etc.,
// import from "@hex-di/graph/internal" instead.

// Batch duplicate detection (for provideMany validation)
export type {
  HasDuplicatesInBatch,
  FindBatchDuplicate,
  BatchDuplicateErrorMessage,
} from "./validation/types/batch-duplicates.js";

// Inference utilities (commonly used in advanced patterns)
export type {
  InferManyProvides,
  InferManyRequires,
  InferManyAsyncPorts,
  InferClonable,
  IsClonableAdapter,
} from "./adapter/types/adapter-inference.js";
