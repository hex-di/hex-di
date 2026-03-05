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
 * - Capability analysis for ambient authority detection
 * - Protocol state machines for session-typed service interfaces
 * - Scoped reference tracking with branded types
 * - Formal disposal ordering with dependency-aware phasing
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
  InferFreeze,
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

// Operation completeness types
export type {
  VerifyOperationCompleteness,
  MissingOperationsError,
  IsMissingOperationsError,
  UnwrapFactoryOk,
  AdapterWithCompletenessCheck,
} from "./adapters/completeness.js";

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
  getAdapterFreezeConfig,
} from "./adapters/guards.js";

// Adapter lifecycle types
export type {
  AdapterLifecycleState,
  StateGuardedMethod,
  ValidTransition,
  CanTransition,
  AdapterHandle,
} from "./adapters/lifecycle.js";

// Adapter handle runtime implementation
export {
  createAdapterHandle,
  assertTransition,
  InvalidTransitionError,
} from "./adapters/handle.js";
export type { AdapterHandleConfig } from "./adapters/handle.js";

// =============================================================================
// Capabilities
// =============================================================================

export {
  methodConstraint,
  constrainCapability,
  getConstrainedMethods,
} from "./capabilities/index.js";
export type {
  Capability,
  ConstrainedCapability,
  CapabilityConstraints,
  MethodConstraint,
  ServiceOf,
  NameOf,
  IsConstrained,
  ConstraintsOf,
  CapabilitiesAvailable,
} from "./capabilities/index.js";

// =============================================================================
// Scoped Reference Tracking
// =============================================================================

// Scoped reference branded types
export type {
  ScopedRef,
  ScopeBrandSymbol,
  IsScopedRef,
  ExtractScopeId,
  ExtractService,
  ScopedContainer,
} from "./scopes/index.js";

// Scope escape detection types
export type {
  ScopeBound,
  ContainsScopedRef,
  AssertNoEscape,
  ScopeCallback,
  WithScopeFn,
} from "./scopes/index.js";

// Scope transfer
export type { TransferRecord, TransferRefFn } from "./scopes/index.js";

export { ScopeTransferError, transferRef, createTransferRecord } from "./scopes/index.js";

// =============================================================================
// Protocols
// =============================================================================

// Protocol state machine types
export type {
  ProtocolPort,
  TransitionMap,
  Transition,
  AvailableMethods,
  ProtocolError,
  ProtocolMethod,
  ProtocolSpec,
  ValidateTransitionMap,
  IsValidProtocol,
} from "./protocols/types.js";

// Protocol factory and runtime utilities
export {
  defineProtocol,
  InvalidProtocolError,
  isMethodAvailable,
  getNextState,
  getAvailableMethodNames,
} from "./protocols/factory.js";
export type { DefineProtocolConfig } from "./protocols/factory.js";

// =============================================================================
// Errors
// =============================================================================

// Error codes
export { NumericErrorCode, ErrorCode } from "./errors/codes.js";
export type { NumericErrorCodeType, ErrorCodeType } from "./errors/codes.js";

// Base error class
export { ContainerError, extractErrorMessage, hasMessageProperty } from "./errors/base.js";

// Blame context types
export type { BlameContext, BlameViolationType } from "./errors/blame.js";
export { createBlameContext } from "./errors/blame.js";

// Blame-enhanced error formatting
export { formatBlameError } from "./errors/formatting.js";

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
// Contracts
// =============================================================================

// Contract validation types
export type {
  ContractViolation,
  ConformanceCheckResult,
  SignatureCheck,
  PortMethodSpec,
  PortMemberSpec,
  ContractCheckMode,
} from "./contracts/index.js";

// Contract validation functions
export { checkConformance, deriveMethodSpecs } from "./contracts/index.js";
export { checkSignatures } from "./contracts/index.js";

// Contract violation error
export { ContractViolationError } from "./contracts/index.js";

// Behavioral port specifications
export type {
  Predicate,
  NamedCondition,
  MethodContract,
  BehavioralPortSpec,
  StateInvariant,
  StatefulPortSpec,
  VerificationConfig,
  VerificationViolation,
} from "./contracts/index.js";

// Runtime behavioral verification
export {
  wrapWithVerification,
  PreconditionViolationError,
  PostconditionViolationError,
  InvariantViolationError,
} from "./contracts/index.js";

// =============================================================================
// Inspection
// =============================================================================

// Container inspection types
export type {
  InheritanceMode,
  ServiceOrigin,
  ContainerKind,
  ContainerPhase,
  DisposalPhase,
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
// Disposal Ordering
// =============================================================================

// Disposal plan types
export type {
  DisposalPhaseEntry,
  DisposalPhase as DisposalPlanPhase,
  DisposalPlan,
  DisposalErrorEntry,
  DisposalResult,
  DependencyEntry,
} from "./disposal/index.js";

// Disposal plan computation and execution
export { computeDisposalPlan, DisposalCycleInvariantError } from "./disposal/index.js";
export { executeDisposalPlan } from "./disposal/index.js";
export type { DisposalInstanceProvider, ExecuteDisposalOptions } from "./disposal/execute-plan.js";

// =============================================================================
// Capability Analysis
// =============================================================================

export { detectAmbientAuthority } from "./capability/analyzer.js";
export { auditGraph } from "./capability/audit.js";
export type {
  AmbientAuthorityKind,
  AmbientAuthorityDetection,
  AdapterAuditEntry,
  CapabilityAuditReport,
} from "./capability/types.js";

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

// =============================================================================
// Resources (Disposal Polymorphism)
// =============================================================================

export { isDisposableConfig, inferResourceKind } from "./resources/index.js";
export type {
  Disposable,
  NonDisposable,
  AnyResource,
  ResourceKind,
  ResourceKindOf,
  IsDisposable,
  IsNonDisposable,
  InferResourceKind,
  AggregateDisposal,
  TrackedScope,
} from "./resources/index.js";

// =============================================================================
// Effects / Capabilities
// =============================================================================

export { analyzeCapabilityProfile, verifyCapabilityUsage } from "./effects/index.js";
export type {
  CapabilityError,
  MakeCapabilityError,
  CapabilitiesExercised,
  ErrorsByCapability,
  ExercisesCapability,
  IsPureComputation,
  CapabilityProfile,
  VerifyCapabilityUsage,
  CapabilityProfileEntry,
} from "./effects/index.js";

// =============================================================================
// Chaperone (Contract Enforcement)
// =============================================================================

export { chaperoneService, createPortContract } from "./chaperone/index.js";
export type {
  EnforcementMode,
  ChaperoneConfig,
  ChaperoneViolation,
  PortContract,
} from "./chaperone/index.js";
