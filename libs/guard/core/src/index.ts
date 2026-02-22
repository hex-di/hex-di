// Errors
export * from "./errors/codes.js";
export type {
  AccessDeniedError as GuardAccessDeniedErrorType,
  CircularRoleInheritanceError,
  PolicyEvaluationError,
  PolicyDeserializationError,
  AuditTrailWriteError,
  SignatureError,
  AuditEntryParseError,
  AuditTrailReadError,
  MetaAuditWriteError,
  ArchivalError,
  DataRetentionError,
  ClockDriftWarning,
  ScopeDisposalError,
  AttributeResolveError,
  DecommissionError,
  ValidationError,
  RelationshipResolveError,
  CircuitOpenError,
  ScopeExpiredError,
  RateLimitExceededError,
  AttributeResolveTimeoutError,
  RelationshipResolverMissingError,
  ChainIntegrityError,
  ResourceIdMissingError,
  GuardError,
} from "./errors/types.js";

// Tokens
export * from "./tokens/permission.js";
export * from "./tokens/permission-group.js";
export * from "./tokens/role.js";

// Policy
export * from "./policy/constraint.js";
export * from "./policy/types.js";
export * from "./policy/matchers.js";
export type { CombinatorOptions } from "./policy/combinators.js";
export * from "./policy/combinators.js";

// Evaluator
export * from "./evaluator/decision.js";
export * from "./evaluator/trace.js";
export * from "./evaluator/errors.js";
export * from "./evaluator/evaluate.js";
export type {
  AttributeResolver,
  AsyncEvaluateOptions,
  AsyncEvaluationError,
} from "./evaluator/async.js";
export { evaluateAsync } from "./evaluator/async.js";
export type {
  RelationshipResolver,
  RelationshipResolverPort,
} from "./evaluator/rebac.js";
export { NoopRelationshipResolver } from "./evaluator/rebac.js";

// Subject
export * from "./subject/auth-subject.js";
export * from "./subject/provider-port.js";
export * from "./subject/adapter.js";

// Guard — export types carefully to avoid name clashes
export type {
  MethodPolicyMap,
  GuardOptions,
  AuditEntry,
  AuditTrail,
  AuditTrailPort,
  ClockSource,
  ElectronicSignature,
  SignatureService,
  SignatureServicePort,
  GuardAccessDeniedError,
  GxPAuditEntry,
  FieldMaskContextPort,
  PolicyChangeAuditEntry,
  GuardHealthCheckResult,
  AuditQueryPort,
} from "./guard/types.js";
export { SystemClock } from "./guard/types.js";
export type { GuardGraph, CompletenessMonitor, EnforcePolicyError } from "./guard/guard.js";
export {
  AccessDeniedError,
  AuditWriteFailedError,
  enforcePolicy,
  createNoopAuditTrailAdapter,
  createGuardGraph,
  createGuardHealthCheck,
  createCompletenessMonitor,
} from "./guard/guard.js";
export { createPolicyChangeAuditEntry } from "./guard/policy-change.js";
export type {
  GuardAllowEvent,
  GuardDenyEvent,
  GuardErrorEvent,
  GuardEvent,
  GuardEventSink,
  GuardEventSinkPort,
} from "./guard/events.js";
export { NoopGuardEventSink } from "./guard/events.js";
export type {
  GuardSpanAttributes,
  GuardSpanHandle,
  GuardSpanSink,
  GuardSpanSinkPort,
} from "./guard/spans.js";
export { NoopGuardSpanSink } from "./guard/spans.js";

// GxP Infrastructure
export type { WalEntry, WalError, WriteAheadLog } from "./guard/wal.js";
export { createWriteAheadLog } from "./guard/wal.js";
export type {
  CircuitBreakerState,
  CircuitBreakerOptions,
  CircuitBreaker,
} from "./guard/circuit-breaker.js";
export { createCircuitBreaker } from "./guard/circuit-breaker.js";
export type {
  DisposalChainResult,
  ScopeDisposalVerifier,
} from "./guard/disposal.js";
export { createScopeDisposalVerifier } from "./guard/disposal.js";
export { detectClockDrift, checkClockDrift } from "./guard/clock.js";
export type { RetentionPolicy } from "./guard/retention.js";
export { enforceRetention, getPurgeableEntries } from "./guard/retention.js";
export type {
  MetaAuditEntry,
  DataClassificationChangeEntry,
  MetaAuditTrail,
  MetaAuditTrailPort,
} from "./guard/meta-audit.js";
export {
  createMetaAuditEntry,
  createDataClassificationChangeEntry,
  createNoopMetaAuditTrail,
} from "./guard/meta-audit.js";
export type {
  GuardAuditArchive,
  DecommissioningStep,
  DecommissioningChecklist,
  ArchivalOptions,
} from "./guard/decommission.js";
export {
  archiveAuditTrail,
  createDecommissioningChecklist,
  completeDecommissioningStep,
} from "./guard/decommission.js";
export type { ScopeOptions, ScopeRegistry } from "./guard/scope.js";
export { createScopeRegistry } from "./guard/scope.js";

// Hook
export * from "./hook/port-gate.js";
export * from "./hook/role-gate.js";

// Serialization
export * from "./serialization/serialize.js";
export * from "./serialization/deserialize.js";
export * from "./serialization/explain.js";

// Signature
export type {
  ElectronicSignature as SignatureElectronicSignature,
  SignatureCaptureRequest,
  ReauthenticationChallenge,
  ReauthenticationToken,
  SignatureValidationResult,
} from "./signature/types.js";
export type { SignatureServicePort as SignaturePort } from "./signature/port.js";
export { NoopSignatureService } from "./signature/port.js";
export * from "./signature/meanings.js";

// Inspection / DevTools
export type {
  GuardInspectionSnapshot,
  GuardInspectionEventListener,
} from "./inspection/inspector.js";
export { GuardInspector } from "./inspection/inspector.js";

// Utils
export * from "./utils/flatten.js";
export * from "./utils/inference.js";
export { timingSafeEqual } from "./utils/timing.js";
