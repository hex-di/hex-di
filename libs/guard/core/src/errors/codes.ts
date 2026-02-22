/**
 * Guard error codes.
 *
 * ACL prefixed codes for all guard-domain errors. Container-level
 * errors (missing dependencies) use HEX codes, not ACL codes.
 */

export const ACL001 = "ACL001" as const;
export const ACL002 = "ACL002" as const;
export const ACL003 = "ACL003" as const;
export const ACL004 = "ACL004" as const;
export const ACL005 = "ACL005" as const;
export const ACL006 = "ACL006" as const;
export const ACL007 = "ACL007" as const;
export const ACL008 = "ACL008" as const;
export const ACL009 = "ACL009" as const;
export const ACL010 = "ACL010" as const;
export const ACL011 = "ACL011" as const;
export const ACL012 = "ACL012" as const;
export const ACL013 = "ACL013" as const;
export const ACL014 = "ACL014" as const;
export const ACL015 = "ACL015" as const;
export const ACL016 = "ACL016" as const;
export const ACL017 = "ACL017" as const;
export const ACL018 = "ACL018" as const;
export const ACL019 = "ACL019" as const;
export const ACL020 = "ACL020" as const;
export const ACL021 = "ACL021" as const;
export const ACL022 = "ACL022" as const;
export const ACL023 = "ACL023" as const;
export const ACL024 = "ACL024" as const;
export const ACL025 = "ACL025" as const;
export const ACL026 = "ACL026" as const;
export const ACL027 = "ACL027" as const;
export const ACL028 = "ACL028" as const;
export const ACL029 = "ACL029" as const;
export const ACL030 = "ACL030" as const;
export const ACL031 = "ACL031" as const;

export type GuardErrorCode =
  | typeof ACL001
  | typeof ACL002
  | typeof ACL003
  | typeof ACL004
  | typeof ACL005
  | typeof ACL006
  | typeof ACL007
  | typeof ACL008
  | typeof ACL009
  | typeof ACL010
  | typeof ACL011
  | typeof ACL012
  | typeof ACL013
  | typeof ACL014
  | typeof ACL015
  | typeof ACL016
  | typeof ACL017
  | typeof ACL018
  | typeof ACL019
  | typeof ACL020
  | typeof ACL021
  | typeof ACL022
  | typeof ACL023
  | typeof ACL024
  | typeof ACL025
  | typeof ACL026
  | typeof ACL027
  | typeof ACL028
  | typeof ACL029
  | typeof ACL030
  | typeof ACL031;

/**
 * Human-readable descriptions of each error code.
 */
export const ERROR_CODE_DESCRIPTIONS: Readonly<Record<GuardErrorCode, string>> = {
  [ACL001]: "AccessDenied — policy evaluation resulted in denial",
  [ACL002]: "CircularRoleInheritance — role inheritance graph contains a cycle",
  [ACL003]: "PolicyEvaluationError — policy evaluation threw an exception",
  [ACL004]: "NotAPermission — value is not a Permission token",
  [ACL005]: "NotARole — value is not a Role token",
  [ACL006]: "DuplicatePermission — same resource:action pair registered multiple times",
  [ACL007]: "PolicyDeserializationFailed — policy JSON is invalid",
  [ACL008]: "AuditTrailWriteError — audit record could not be persisted",
  [ACL009]: "SignatureError — electronic signature operation failed",
  [ACL010]: "WALError — write-ahead log operation failed",
  [ACL011]: "MetaAuditWriteError — meta-audit record could not be persisted",
  [ACL012]: "ArchivalError — audit trail archival failed",
  [ACL013]: "DataRetentionError — data retention enforcement failed",
  [ACL014]: "AuditEntryParseError — audit entry JSON is invalid",
  [ACL015]: "AuditTrailReadError — audit trail read operation failed",
  [ACL016]: "ClockDriftWarning — system clock drift exceeds acceptable threshold",
  [ACL017]: "ScopeDisposalError — scope disposal chain verification failed",
  [ACL018]: "AttributeResolveError — attribute resolution threw an exception",
  [ACL019]: "TenantIsolationViolation — cross-tenant data access detected",
  [ACL020]: "DecommissionError — decommissioning checklist verification failed",
  [ACL021]: "ValidationError — qualification protocol validation failed",
  [ACL022]: "RelationshipResolveError — relationship check threw an exception",
  [ACL023]: "CircuitOpenError — audit trail circuit breaker is open",
  [ACL024]: "ScopeExpiredError — authorization scope TTL has elapsed",
  [ACL025]: "RateLimitExceededError — per-scope call rate limit exceeded",
  [ACL026]: "AttributeResolveTimeoutError — attribute resolution timed out",
  [ACL027]: "AttributeResolveError — async attribute resolution failed",
  [ACL028]: "RelationshipResolverMissingError — RelationshipResolverPort not wired",
  [ACL029]: "ChainIntegrityError — audit chain integrity verification failed",
  [ACL030]: "ResourceIdMissingError — resource.id required for relationship check",
  [ACL031]: "PortGatedError — port is gated by static configuration",
};
