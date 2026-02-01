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
 * - Trace collectors for resolution monitoring
 * - Resolution span types and utilities
 * - Type-level and runtime utilities
 *
 * @packageDocumentation
 */

// =============================================================================
// Ports
// =============================================================================

export { createPort, port } from "./ports/factory.js";
export type { Port, InferService, InferPortName, NotAPortError } from "./ports/types.js";

// Directed ports
export {
  createInboundPort,
  createOutboundPort,
  isDirectedPort,
  isInboundPort,
  isOutboundPort,
  getPortDirection,
  getPortMetadata,
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
  EmptyDeps,
} from "./adapters/types.js";

// Type inference
export type {
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  InferManyProvides,
  InferManyRequires,
  InferManyAsyncPorts,
  InferClonable,
  IsClonableAdapter,
} from "./adapters/inference.js";

// Factory functions
export { createAdapter, createAsyncAdapter } from "./adapters/factory.js";

// Service definition
export { defineService, defineAsyncService, createClassAdapter } from "./adapters/service.js";

// Fluent builder
export { ServiceBuilder } from "./adapters/builder.js";

// Class-based builder
export { fromClass, ClassAdapterBuilder, ClassServiceBuilder } from "./adapters/from-class.js";

// Lazy ports
export { lazyPort, isLazyPort, getOriginalPort } from "./adapters/lazy.js";
export type { LazyPort, IsLazyPort, UnwrapLazyPort } from "./adapters/lazy.js";

// Type guards
export { isAdapter, isLifetime, isFactoryKind } from "./adapters/guards.js";

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
} from "./inspection/tracing-types.js";
export { DEFAULT_RETENTION_POLICY, hasTracingAccess } from "./inspection/tracing-types.js";

// Graph inspection types
export type {
  InspectableGraph,
  GraphSuggestion,
  GraphInspection,
  ValidationResult,
  GraphInspectionJSON,
  InspectionToJSONOptions,
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
} from "./inspection/inspector-types.js";

// =============================================================================
// Collectors
// =============================================================================

export type { TraceCollector, TraceSubscriber, Unsubscribe } from "./collectors/types.js";
export { MemoryCollector } from "./collectors/memory.js";
export { NoOpCollector } from "./collectors/noop.js";
export { CompositeCollector } from "./collectors/composite.js";

// =============================================================================
// Span
// =============================================================================

export type { ResolutionSpan } from "./span/types.js";
export { SpanBuilder, toSpan, getSelfTime, getSpanDepth, countSpans } from "./span/builder.js";
export type { ContainerMetrics, LifetimeMetrics, PortMetrics } from "./span/metrics.js";
export { MetricsCollector, fromTraceStats } from "./span/metrics.js";

// =============================================================================
// Utilities
// =============================================================================

export type { IsNever, TupleToUnion, Prettify, InferenceError } from "./utils/type-utilities.js";
export { generateCorrelationId } from "./utils/correlation.js";
