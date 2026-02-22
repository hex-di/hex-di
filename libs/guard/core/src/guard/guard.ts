import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { PolicyConstraint } from "../policy/constraint.js";
import type { AuthSubject } from "../subject/auth-subject.js";
import type {
  AuditEntry,
  AuditTrail,
  AuditTrailPort,
  GuardOptions,
  GuardHealthCheckResult,
} from "./types.js";
import { evaluate } from "../evaluator/evaluate.js";
import type { Decision } from "../evaluator/decision.js";
import { ACL001, ACL008 } from "../errors/codes.js";
import type { AuditTrailWriteError, PolicyEvaluationError } from "../errors/types.js";

/**
 * Error thrown when guard() denies access during adapter resolution.
 */
export class AccessDeniedError extends Error {
  readonly code = ACL001;

  constructor(
    readonly policy: PolicyConstraint,
    readonly decision: Decision & { kind: "deny" },
    readonly portName: string,
    readonly subjectId: string,
  ) {
    super(
      `Access denied for port '${portName}': ${decision.reason}`,
    );
    this.name = "AccessDeniedError";
  }
}

/**
 * Error thrown when an audit trail write fails and failOnAuditError is true.
 */
export class AuditWriteFailedError extends Error {
  readonly code = ACL008;

  constructor(readonly writeError: AuditTrailWriteError) {
    super(`Audit trail write failed: ${writeError.message}`);
    this.name = "AuditWriteFailedError";
  }
}

/**
 * Maximum length for AuditEntry.reason field.
 * Reasons exceeding this length are silently truncated with a suffix marker.
 */
const MAX_REASON_LENGTH = 2048;
const TRUNCATION_SUFFIX = '…[truncated]';

/**
 * Truncates a reason string to MAX_REASON_LENGTH characters.
 * If the string exceeds the limit, it is truncated and a suffix is appended.
 * The total length of the truncated result is exactly MAX_REASON_LENGTH.
 */
function truncateReason(reason: string): string {
  if (reason.length <= MAX_REASON_LENGTH) {
    return reason;
  }
  const cutAt = MAX_REASON_LENGTH - TRUNCATION_SUFFIX.length;
  return reason.slice(0, cutAt) + TRUNCATION_SUFFIX;
}

/**
 * Discriminated union of errors returned by enforcePolicy().
 */
export type EnforcePolicyError =
  | AccessDeniedError
  | AuditWriteFailedError
  | PolicyEvaluationError;

/**
 * Enforces a policy before delegating to the subject factory.
 *
 * This is the core enforcement logic called by guard adapters.
 * It is synchronous by design.
 */
export function enforcePolicy(options: {
  readonly policy: PolicyConstraint;
  readonly subject: AuthSubject;
  readonly portName: string;
  readonly scopeId: string;
  readonly auditTrail: AuditTrail | null;
  readonly failOnAuditError: boolean;
  readonly resource?: Readonly<Record<string, unknown>>;
  readonly fieldMaskAdapter?: {
    readonly onVisibleFields: (fields: ReadonlyArray<string>, evaluationId: string) => void;
  };
}): Result<void, EnforcePolicyError> {
  const result = evaluate(options.policy, {
    subject: options.subject,
    resource: options.resource,
  });

  if (result.isErr()) {
    return err(result.error);
  }

  const decision = result.value;
  const auditEntry: AuditEntry = Object.freeze({
    evaluationId: decision.evaluationId,
    timestamp: decision.evaluatedAt,
    subjectId: decision.subjectId,
    authenticationMethod: options.subject.authenticationMethod,
    policy: options.policy.kind,
    decision: decision.kind,
    portName: options.portName,
    scopeId: options.scopeId,
    reason:
      decision.kind === "deny" ? truncateReason(decision.reason) : "Access granted",
    durationMs: decision.durationMs,
    schemaVersion: 1,
    sessionId: options.subject.sessionId,
    identityProvider: options.subject.identityProvider,
  });

  if (options.auditTrail !== null) {
    const auditResult = options.auditTrail.record(auditEntry);
    if (auditResult.isErr() && options.failOnAuditError) {
      return err(new AuditWriteFailedError(auditResult.error));
    }
  }

  if (
    options.fieldMaskAdapter !== undefined &&
    decision.kind === "allow" &&
    decision.visibleFields !== undefined
  ) {
    options.fieldMaskAdapter.onVisibleFields(decision.visibleFields, decision.evaluationId);
  }

  if (decision.kind === "deny") {
    return err(new AccessDeniedError(
      options.policy,
      decision,
      options.portName,
      decision.subjectId,
    ));
  }

  return ok(undefined);
}

/**
 * Creates a no-op audit trail adapter that discards all entries.
 *
 * @gxpWarning NOT SUITABLE FOR GxP-REGULATED ENVIRONMENTS.
 * This adapter discards all audit entries without persisting them.
 * Production systems must provide a cryptographically sound AuditTrail
 * implementation that meets ALCOA+ requirements.
 */
export function createNoopAuditTrailAdapter(): AuditTrailPort {
  return {
    record(_entry: AuditEntry): Result<void, AuditTrailWriteError> {
      return ok(undefined);
    },
  };
}

/**
 * Guard graph descriptor returned by createGuardGraph().
 * Provides factory methods for constructing guard infrastructure.
 */
export interface GuardGraph {
  /** Creates a noop audit trail for non-GxP environments. */
  readonly noopAuditTrail: AuditTrailPort;
  /** Runs the policy enforcer inline for testing. */
  enforce(options: {
    readonly policy: PolicyConstraint;
    readonly subject: AuthSubject;
    readonly portName: string;
    readonly scopeId: string;
    readonly auditTrail?: AuditTrail;
    readonly failOnAuditError?: boolean;
    readonly resource?: Readonly<Record<string, unknown>>;
  }): Result<void, EnforcePolicyError>;
}

/**
 * Creates a self-contained guard graph with the given configuration.
 * This is the primary factory for composing guard infrastructure in application graphs.
 *
 * @example
 * ```ts
 * const guard = createGuardGraph();
 * guard.enforce({ policy, subject, portName: "UserPort", scopeId: scope.id });
 * ```
 */
export function createGuardGraph(): GuardGraph {
  const noopAuditTrail = createNoopAuditTrailAdapter();

  return {
    noopAuditTrail,
    enforce(options): Result<void, EnforcePolicyError> {
      return enforcePolicy({
        policy: options.policy,
        subject: options.subject,
        portName: options.portName,
        scopeId: options.scopeId,
        auditTrail: options.auditTrail ?? null,
        failOnAuditError: options.failOnAuditError ?? true,
        resource: options.resource,
      });
    },
  };
}

/**
 * Runs a health check against the guard infrastructure.
 * Tests audit trail reachability with a probe entry.
 */
export function createGuardHealthCheck(
  auditTrail: AuditTrailPort,
): () => GuardHealthCheckResult {
  return (): GuardHealthCheckResult => {
    const start = performance.now();
    const checkedAt = new Date().toISOString();
    const errors: string[] = [];

    const probeEntry: AuditEntry = {
      evaluationId: `health-check-${Date.now()}`,
      timestamp: checkedAt,
      subjectId: "health-check",
      authenticationMethod: "system",
      policy: "hasRole",
      decision: "allow",
      portName: "HealthCheckPort",
      scopeId: "health-check",
      reason: "Health check probe",
      durationMs: 0,
      schemaVersion: 1,
    };

    let auditTrailReachable = false;
    const result = auditTrail.record(probeEntry);
    if (result.isOk()) {
      auditTrailReachable = true;
    } else {
      errors.push(`Audit trail write failed: ${result.error.message}`);
    }

    const latencyMs = performance.now() - start;

    return Object.freeze({
      healthy: auditTrailReachable && errors.length === 0,
      auditTrailReachable,
      checkedAt,
      latencyMs,
      errors: Object.freeze([...errors]),
    });
  };
}

export type { GuardOptions };

/**
 * Tracks port resolution vs audit entry counts for completeness monitoring.
 */
export interface CompletenessMonitor {
  recordResolution(portName: string): void;
  recordAuditEntry(portName: string): void;
  queryCompleteness(portName: string): {
    readonly resolutions: number;
    readonly auditEntries: number;
    readonly discrepancy: number;
  };
  readonly portNames: readonly string[];
}

/**
 * Creates a completeness monitor for tracking resolution/audit parity.
 * GxP REQUIRED when gxp: true.
 */
export function createCompletenessMonitor(): CompletenessMonitor {
  const _resolutions = new Map<string, number>();
  const _auditEntries = new Map<string, number>();

  function increment(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return {
    recordResolution(portName: string): void {
      increment(_resolutions, portName);
    },
    recordAuditEntry(portName: string): void {
      increment(_auditEntries, portName);
    },
    queryCompleteness(portName: string) {
      const resolutions = _resolutions.get(portName) ?? 0;
      const auditEntries = _auditEntries.get(portName) ?? 0;
      return Object.freeze({ resolutions, auditEntries, discrepancy: resolutions - auditEntries });
    },
    get portNames(): readonly string[] {
      return Object.freeze([...new Set([..._resolutions.keys(), ..._auditEntries.keys()])]);
    },
  };
}
