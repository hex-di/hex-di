/**
 * @hex-di/core - Foundation Package
 *
 * Zero-dependency foundational building blocks for HexDI.
 *
 * Provides:
 * - Port type definitions and factory functions
 * - Adapter types, constants, and factory functions
 * - Error codes, classes, and parsing utilities
 * - Inspection types for containers and graphs
 * - Type-level and runtime utilities
 *
 * @packageDocumentation
 */

// =============================================================================
// Ports
// =============================================================================

export { createPort, port } from "./ports/factory.js";
export type {
  Port,
  InferService,
  InferPortName,
  InferPortCategory,
  NotAPortError,
} from "./ports/types.js";

// Directed ports
export {
  isDirectedPort,
  isInboundPort,
  isOutboundPort,
  getPortDirection,
  getPortMetadata,
  assertPortFrozen,
} from "./ports/directed.js";
export type {
  PortDirection,
  PortMetadata,
  DirectedPort,
  InboundPort,
  OutboundPort,
  IsDirectedPort,
  InferPortDirection,
  InferPortMetadata,
  InboundPorts,
  OutboundPorts,
  CreatePortConfig,
  SuggestedCategory,
} from "./ports/types.js";

// =============================================================================
// Adapters
// =============================================================================

// Constants
export {
  SYNC,
  ASYNC,
  SINGLETON,
  SCOPED,
  TRANSIENT,
  TRUE,
  FALSE,
  EMPTY_REQUIRES,
} from "./adapters/constants.js";

// Types
export type {
  Adapter,
  AdapterConstraint,
  Lifetime,
  FactoryKind,
  ResolvedDeps,
  PortDeps,
  EmptyDeps,
} from "./adapters/types.js";

// Type inference
export type {
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  InferAdapterError,
  InferManyProvides,
  InferManyRequires,
  InferManyAsyncPorts,
  InferManyErrors,
  InferClonable,
  IsClonableAdapter,
} from "./adapters/inference.js";

// Factory functions
export {
  createAdapter,
  createAdapter as createUnifiedAdapter,
  adapterOrDie,
  adapterOrElse,
  adapterOrHandle,
  type PortsToServices,
  type BothFactoryAndClassError,
  type NeitherFactoryNorClassError,
  type AsyncLifetimeError,
  type IsAsyncFactory,
  type BaseUnifiedConfig,
  type FactoryConfig,
  type FactoryResult,
  type InferFactoryError,
  type ClassConfig,
} from "./adapters/unified.js";

// Lazy ports
export { lazyPort, isLazyPort, getOriginalPort } from "./adapters/lazy.js";
export type { LazyPort, IsLazyPort, UnwrapLazyPort } from "./adapters/lazy.js";

// Type guards
export {
  isAdapter,
  isLifetime,
  isFactoryKind,
  isAdapterFrozen,
  assertAdapterFrozen,
} from "./adapters/guards.js";

// =============================================================================
// Errors
// =============================================================================

// Error codes
export { NumericErrorCode, ErrorCode } from "./errors/codes.js";
export type { NumericErrorCodeType, ErrorCodeType } from "./errors/codes.js";

// Base error class
export { ContainerError, extractErrorMessage, hasMessageProperty } from "./errors/base.js";

// Concrete error classes
export {
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  NonClonableForkedError,
} from "./errors/classes.js";

// Resolution error union
export type { ResolutionError } from "./errors/resolution-error.js";
export { isResolutionError, toResolutionError } from "./errors/resolution-error.js";

// Error parsing
export { isHexError, parseError } from "./errors/parsing.js";

// Error types
export type {
  ParsedError,
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
} from "./errors/types.js";

// =============================================================================
// Inspection
// =============================================================================

// Container inspection types
export type {
  InheritanceMode,
  ServiceOrigin,
  ContainerKind,
  ContainerPhase,
  SingletonEntry,
  ScopeInfo,
  ScopeTree,
  RootContainerSnapshot,
  ChildContainerSnapshot,
  LazyContainerSnapshot,
  ScopeSnapshot,
  ContainerSnapshot,
} from "./inspection/container-types.js";

// Tracing types
export type {
  TraceEntry,
  TraceStats,
  TraceFilter,
  TraceRetentionPolicy,
  TracingOptions,
  TracingAPI,
  TraceEvictionReason,
} from "./inspection/tracing-types.js";
export { DEFAULT_RETENTION_POLICY, hasTracingAccess } from "./inspection/tracing-types.js";

// Tracing warning utilities
export {
  configureTracingWarning,
  emitTracingWarning,
  resetTracingWarning,
  getTracingWarningConfig,
  TRACING_NOT_CONFIGURED_CODE,
  DEFAULT_TRACING_WARNING_CONFIG,
} from "./inspection/tracing-warning.js";
export type { TracingWarningConfig } from "./inspection/tracing-warning.js";

// Graph inspection types
export type {
  InspectableGraph,
  GraphSuggestion,
  GraphInspection,
  ValidationResult,
  GraphInspectionJSON,
  InspectionToJSONOptions,
  PortInfo,
  DirectionSummary,
  PortDirection as GraphPortDirection,
} from "./inspection/graph-types.js";

// Inspector API types
export type {
  ScopeEventInfo,
  AdapterInfo,
  VisualizableAdapter,
  ContainerGraphData,
  InspectorEvent,
  InspectorListener,
  InspectorAPI,
  ResultStatistics,
} from "./inspection/inspector-types.js";

// Library inspector protocol
export type {
  LibraryInspector,
  LibraryEvent,
  LibraryEventListener,
  UnifiedSnapshot,
  LibraryQueryEntry,
  LibraryQueryResult,
  LibraryQueryPredicate,
} from "./inspection/library-inspector-types.js";

export {
  isLibraryInspector,
  createLibraryInspectorPort,
} from "./inspection/library-inspector-types.js";

// =============================================================================
// Utilities
// =============================================================================

export type { IsNever, TupleToUnion, Prettify, InferenceError } from "./utils/type-utilities.js";
export {
  generateCorrelationId,
  configureCorrelationId,
  resetCorrelationId,
} from "./utils/correlation.js";
export type { CorrelationIdConfig } from "./utils/correlation.js";

// =============================================================================
// Context
// =============================================================================

export { createContextVariable, withContext, getContext } from "./context/index.js";
export type { ContextVariable } from "./context/index.js";
