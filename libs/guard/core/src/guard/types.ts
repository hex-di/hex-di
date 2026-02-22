import type { PolicyConstraint } from "../policy/constraint.js";
import type { Deny } from "../evaluator/decision.js";
import type { AuditTrailWriteError } from "../errors/types.js";
import type { Result } from "@hex-di/result";

/**
 * A map of method names to their per-method authorization policies.
 */
export type MethodPolicyMap<TKeys extends string = string> = Readonly<
  Partial<Record<TKeys, PolicyConstraint>>
>;

/**
 * Options for the guard() factory.
 */
export interface GuardOptions {
  readonly resolve: PolicyConstraint;
  readonly methodPolicies?: MethodPolicyMap;
  /** When true, audit write failure throws AuditTrailWriteError. Default: true. */
  readonly failOnAuditError?: boolean;
  /**
   * Optional callback adapter for receiving field-level visibility context.
   * Called when an Allow decision carries `visibleFields`.
   * Use this to register a FieldMaskContextPort in the enclosing DI scope.
   */
  readonly fieldMaskAdapter?: {
    readonly onVisibleFields: (fields: ReadonlyArray<string>, evaluationId: string) => void;
  };
}

/**
 * A single audit trail entry recording an authorization decision.
 */
export interface AuditEntry {
  readonly evaluationId: string;
  readonly timestamp: string;
  readonly subjectId: string;
  readonly authenticationMethod: string;
  readonly policy: string;
  readonly decision: "allow" | "deny";
  readonly portName: string;
  readonly scopeId: string;
  readonly reason: string;
  readonly durationMs: number;
  readonly schemaVersion: number;
  readonly sessionId?: string;
  readonly identityProvider?: string;
  readonly sequenceNumber?: number;
  readonly traceDigest?: string;
  readonly policySnapshot?: string;
  readonly tenantId?: string;
}

/**
 * Service interface for recording authorization audit entries.
 */
export interface AuditTrail {
  record(entry: AuditEntry): Result<void, AuditTrailWriteError>;
}

/**
 * Port for the audit trail service.
 */
export interface AuditTrailPort {
  record(entry: AuditEntry): Result<void, AuditTrailWriteError>;
}

/**
 * A clock source for timestamping.
 */
export interface ClockSource {
  now(): string;
}

/**
 * System clock implementation using Date.toISOString().
 * Produces ISO 8601 UTC timestamps suitable for audit entries.
 * @warning Not suitable for GxP environments without NTP synchronization.
 */
export class SystemClock implements ClockSource {
  now(): string {
    return new Date().toISOString();
  }
}

/**
 * An electronic signature captured for a policy evaluation.
 */
export interface ElectronicSignature {
  readonly signerId: string;
  readonly signerName?: string;
  readonly signedAt: string;
  readonly meaning: string;
  readonly validated: boolean;
  readonly reauthenticated: boolean;
  readonly signerRoles?: ReadonlyArray<string>;
  readonly algorithm?: string;
}

/**
 * Service interface for capturing and validating electronic signatures.
 */
export interface SignatureService {
  capture(meaning: string, signerRole?: string): Promise<ElectronicSignature>;
  validate(signature: ElectronicSignature): boolean;
}

/**
 * Port for the signature service.
 */
export type SignatureServicePort = SignatureService;

/**
 * Error produced when the guard denies access.
 */
export interface GuardAccessDeniedError extends Error {
  readonly code: "ACL001";
  readonly policy: PolicyConstraint;
  readonly decision: Deny;
  readonly portName: string;
  readonly subjectId: string;
}

/**
 * GxP-specific audit entry extension with required integrity fields.
 *
 * In GxP environments all three hash/signature fields must be populated
 * for ALCOA+ compliance. Use `createNoopAuditTrailAdapter()` only in
 * non-GxP test environments — production systems must provide a
 * cryptographically sound AuditTrail implementation.
 */
export interface GxPAuditEntry extends AuditEntry {
  readonly integrityHash: string;
  readonly previousHash: string;
  readonly signature: string;
  readonly hashChain?: string;
  readonly electronicSignature?: ElectronicSignature;
  readonly sequenceNumber: number;
  readonly traceDigest: string;
  readonly policySnapshot: string;
  readonly hashAlgorithm?: string;
}

/**
 * Port for providing field-level visibility context.
 * Registered in scope when an Allow decision carries `visibleFields`.
 */
export interface FieldMaskContextPort {
  /** Returns the set of fields visible for the current authorization context. */
  getVisibleFields(): ReadonlyArray<string>;
}

/**
 * Audit entry recording a policy configuration change event.
 * Used for change-control traceability in GxP-regulated systems.
 */
export interface PolicyChangeAuditEntry extends AuditEntry {
  readonly changeType: "create" | "update" | "delete" | "activate" | "deactivate";
  readonly changeControlId?: string;
  readonly previousPolicyHash?: string;
  readonly newPolicyHash?: string;
  readonly approvedBy?: string;
}

/**
 * Result from the guard health check.
 */
export interface GuardHealthCheckResult {
  readonly healthy: boolean;
  readonly auditTrailReachable: boolean;
  readonly checkedAt: string;
  readonly latencyMs: number;
  readonly errors: readonly string[];
}

/**
 * Port for querying the audit trail.
 */
export interface AuditQueryPort {
  queryByEvaluationId(id: string): AuditEntry | undefined;
  queryBySubjectId(subjectId: string, options?: { readonly from?: string; readonly to?: string }): readonly AuditEntry[];
  queryByTimeRange(from: string, to: string, options?: { readonly decision?: "allow" | "deny" }): readonly AuditEntry[];
  queryByPortName(portName: string, options?: { readonly from?: string; readonly to?: string }): readonly AuditEntry[];
  exportEntries(options?: { readonly format?: "json" | "jsonl" | "csv" }): string;
}
