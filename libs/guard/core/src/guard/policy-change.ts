import type { PolicyChangeAuditEntry } from "./types.js";

/**
 * Creates a PolicyChangeAuditEntry for recording policy administration events.
 * All required AuditEntry fields are populated with sensible defaults.
 *
 * @example
 * ```ts
 * const entry = createPolicyChangeAuditEntry({
 *   subjectId: "admin-1",
 *   changeType: "update",
 *   changeControlId: "CCR-2024-001",
 *   portName: "PolicyPort",
 *   scopeId: scope.id,
 * });
 * ```
 */
export function createPolicyChangeAuditEntry(
  options: {
    readonly subjectId: string;
    readonly changeType: PolicyChangeAuditEntry["changeType"];
    readonly portName: string;
    readonly scopeId: string;
    readonly changeControlId?: string;
    readonly previousPolicyHash?: string;
    readonly newPolicyHash?: string;
    readonly approvedBy?: string;
    readonly authenticationMethod?: string;
    readonly sessionId?: string;
    readonly identityProvider?: string;
    readonly evaluationId?: string;
    readonly timestamp?: string;
    readonly reason?: string;
  },
): PolicyChangeAuditEntry {
  const now = new Date().toISOString();
  return Object.freeze({
    evaluationId: options.evaluationId ?? `policy-change-${Date.now()}`,
    timestamp: options.timestamp ?? now,
    subjectId: options.subjectId,
    authenticationMethod: options.authenticationMethod ?? "password",
    policy: `policy-change:${options.changeType}`,
    decision: "allow" as const,
    portName: options.portName,
    scopeId: options.scopeId,
    reason: options.reason ?? `Policy ${options.changeType} event`,
    durationMs: 0,
    schemaVersion: 1,
    sessionId: options.sessionId,
    identityProvider: options.identityProvider,
    changeType: options.changeType,
    changeControlId: options.changeControlId,
    previousPolicyHash: options.previousPolicyHash,
    newPolicyHash: options.newPolicyHash,
    approvedBy: options.approvedBy,
  });
}
