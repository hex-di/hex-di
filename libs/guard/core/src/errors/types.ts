import type {
  ACL001,
  ACL002,
  ACL003,
  ACL007,
  ACL008,
  ACL009,
  ACL011,
  ACL012,
  ACL013,
  ACL014,
  ACL015,
  ACL016,
  ACL017,
  ACL018,
  ACL020,
  ACL021,
  ACL022,
  ACL023,
  ACL024,
  ACL025,
  ACL026,
  ACL028,
  ACL029,
  ACL030,
} from "./codes.js";

/**
 * Error produced when access is denied by policy evaluation.
 */
export interface AccessDeniedError {
  readonly code: typeof ACL001;
  readonly message: string;
  readonly policy: string;
  readonly decision: string;
  readonly portName: string;
  readonly subjectId: string;
}

/**
 * Error produced when a circular role inheritance is detected.
 */
export interface CircularRoleInheritanceError {
  readonly code: typeof ACL002;
  readonly message: string;
  readonly roleName: string;
  readonly cycle: readonly string[];
}

/**
 * Error produced when policy evaluation throws.
 */
export interface PolicyEvaluationError {
  readonly code: typeof ACL003;
  readonly message: string;
  readonly policy: string;
  readonly cause: unknown;
}

/**
 * Error produced when policy deserialization fails.
 */
export interface PolicyDeserializationError {
  readonly code: typeof ACL007;
  readonly message: string;
  readonly input: unknown;
  readonly cause?: unknown;
}

/**
 * Error produced when an audit trail write fails.
 */
export interface AuditTrailWriteError {
  readonly code: typeof ACL008;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Error produced when an electronic signature operation fails.
 */
export interface SignatureError {
  readonly code: typeof ACL009;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Error produced when an audit entry cannot be parsed.
 */
export interface AuditEntryParseError {
  readonly code: typeof ACL014;
  readonly message: string;
  readonly input: unknown;
  readonly cause?: unknown;
}

/**
 * Error produced when an audit trail read fails.
 */
export interface AuditTrailReadError {
  readonly code: typeof ACL015;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Error produced when a meta-audit trail write fails.
 */
export interface MetaAuditWriteError {
  readonly code: typeof ACL011;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Error produced when audit trail archival fails.
 */
export interface ArchivalError {
  readonly code: typeof ACL012;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Error produced when data retention enforcement fails.
 */
export interface DataRetentionError {
  readonly code: typeof ACL013;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Warning produced when system clock drift is detected.
 */
export interface ClockDriftWarning {
  readonly code: typeof ACL016;
  readonly message: string;
  readonly driftMs: number;
}

/**
 * Error produced when scope disposal chain verification fails.
 */
export interface ScopeDisposalError {
  readonly code: typeof ACL017;
  readonly message: string;
  readonly undisposed: readonly string[];
}

/**
 * Error produced when async attribute resolution fails.
 */
export interface AttributeResolveError {
  readonly code: typeof ACL018;
  readonly message: string;
  readonly attribute: string;
  readonly cause?: unknown;
}

/**
 * Error produced when decommissioning verification fails.
 */
export interface DecommissionError {
  readonly code: typeof ACL020;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Error produced when qualification protocol validation fails.
 */
export interface ValidationError {
  readonly code: typeof ACL021;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Error produced when relationship resolution fails.
 */
export interface RelationshipResolveError {
  readonly code: typeof ACL022;
  readonly message: string;
  readonly relation: string;
  readonly cause?: unknown;
}

/**
 * Error produced when the audit trail circuit breaker is open.
 */
export interface CircuitOpenError {
  readonly code: typeof ACL023;
  readonly message: string;
}

/**
 * Error produced when an authorization scope's TTL has elapsed.
 */
export interface ScopeExpiredError {
  readonly code: typeof ACL024;
  readonly message: string;
  readonly scopeId: string;
  readonly expiredAt: string;
}

/**
 * Error produced when the per-scope call rate limit is exceeded.
 */
export interface RateLimitExceededError {
  readonly code: typeof ACL025;
  readonly message: string;
  readonly scopeId: string;
  readonly limit: number;
  readonly windowMs: number;
}

/**
 * Error produced when async attribute resolution times out.
 */
export interface AttributeResolveTimeoutError {
  readonly code: typeof ACL026;
  readonly message: string;
  readonly attribute: string;
  readonly timeoutMs: number;
}

/**
 * Error produced when RelationshipResolverPort is not wired.
 */
export interface RelationshipResolverMissingError {
  readonly code: typeof ACL028;
  readonly message: string;
  readonly relation: string;
}

/**
 * Error produced when audit chain integrity verification fails.
 */
export interface ChainIntegrityError {
  readonly code: typeof ACL029;
  readonly message: string;
  readonly scopeId?: string;
}

/**
 * Error produced when resource.id is missing for a relationship check.
 */
export interface ResourceIdMissingError {
  readonly code: typeof ACL030;
  readonly message: string;
  readonly relation: string;
}

/**
 * Union of all guard-domain errors.
 */
export type GuardError =
  | AccessDeniedError
  | CircularRoleInheritanceError
  | PolicyEvaluationError
  | PolicyDeserializationError
  | AuditTrailWriteError
  | SignatureError
  | AuditEntryParseError
  | AuditTrailReadError
  | MetaAuditWriteError
  | ArchivalError
  | DataRetentionError
  | ClockDriftWarning
  | ScopeDisposalError
  | AttributeResolveError
  | DecommissionError
  | ValidationError
  | RelationshipResolveError
  | CircuitOpenError
  | ScopeExpiredError
  | RateLimitExceededError
  | AttributeResolveTimeoutError
  | RelationshipResolverMissingError
  | ChainIntegrityError
  | ResourceIdMissingError;
