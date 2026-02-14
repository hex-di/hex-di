/**
 * @hex-di/graph/advanced - Power User Exports
 *
 * This module exports utilities for power users who need:
 * - Graph validation and inspection
 * - Error parsing and debugging
 * - Traversal utilities
 * - Structured logging
 * - Type-level validation utilities
 *
 * For basic usage, import from "@hex-di/graph" instead.
 * For runtime-only inspection, use "@hex-di/graph/inspection".
 * For internal/unstable types, use "@hex-di/graph/internal".
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

export type {
  GraphInspection,
  GraphSuggestion,
  ValidationResult,
  GraphInspectionJSON,
  InspectionToJSONOptions,
  PortInfo,
  DirectionSummary,
  PortDirection,
  InspectOptions,
  GraphSummary,
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
} from "./validation/index.js";

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
} from "./validation/index.js";

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
// Correlation ID Utilities
// =============================================================================

export type { CorrelationIdGenerator } from "./graph/inspection/correlation.js";
export { createCorrelationIdGenerator } from "./graph/inspection/correlation.js";

// =============================================================================
// Graph Build Error Constructors (for tooling and power users)
// =============================================================================

export {
  CyclicDependencyBuild,
  CaptiveDependencyBuild,
  MissingDependencyBuild,
} from "./errors/index.js";

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
  LifetimeName,
  IsCaptiveDependency,
  AddLifetime,
  GetLifetimeLevel,
  MergeLifetimeMaps,
  FindAnyCaptiveDependency,
  AddManyLifetimes,
  WouldAnyBeCaptive,
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
// Lazy Port Types (re-exported from core for convenience)
// =============================================================================

export type { IsLazyPort, UnwrapLazyPort } from "@hex-di/core";
export { getOriginalPort } from "@hex-di/core";

// =============================================================================
// Async Detection
// =============================================================================

export type { IsAsyncAdapter } from "./validation/types/init-priority.js";

// =============================================================================
// Port Category Utilities
// =============================================================================

export type { PortsByCategory, HasCategory } from "./builder/types/inspection.js";
export type { InferPortCategory } from "@hex-di/core";

// =============================================================================
// Audit Trail
// =============================================================================

export type {
  AuditActor,
  AuditSink,
  AuditEvent,
  AuditBuildAttemptEvent,
  AuditValidationDecisionEvent,
  AuditInspectionEvent,
  AuditDepthFallbackEvent,
  AuditErrorRecord,
  ValidationOutcome,
} from "./audit/index.js";

export { setAuditSink, clearAuditSink, hasAuditSink } from "./audit/index.js";

// =============================================================================
// Port Name Validation
// =============================================================================

export type { PortNameValidationResult } from "./validation/port-name-validation.js";
export { validatePortName } from "./validation/port-name-validation.js";
