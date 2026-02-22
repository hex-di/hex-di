import type { AuditEntry, PolicyChangeAuditEntry } from "@hex-di/guard";
import { createPolicyChangeAuditEntry } from "@hex-di/guard";

/**
 * Creates a minimal AuditEntry for use in tests.
 * All required fields are provided with sensible defaults.
 * The `testMode` flag is set to true to allow filtering test entries.
 *
 * @example
 * ```ts
 * const entry = createTestAuditEntry({ decision: "deny", subjectId: "user-1" });
 * expect(entry.testMode).toBe(true);
 * ```
 */
export function createTestAuditEntry(
  overrides: Partial<AuditEntry & { testMode?: boolean }> = {},
): AuditEntry & { readonly testMode: true } {
  return {
    evaluationId: overrides.evaluationId ?? `eval-${Date.now()}`,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    subjectId: overrides.subjectId ?? "test-subject",
    authenticationMethod: overrides.authenticationMethod ?? "password",
    policy: overrides.policy ?? '{"kind":"hasRole","roleName":"viewer"}',
    decision: overrides.decision ?? "allow",
    portName: overrides.portName ?? "TestPort",
    scopeId: overrides.scopeId ?? "test-scope",
    reason: overrides.reason ?? "Test entry",
    durationMs: overrides.durationMs ?? 0,
    schemaVersion: overrides.schemaVersion ?? 1,
    sessionId: overrides.sessionId,
    identityProvider: overrides.identityProvider,
    testMode: true,
  };
}

/**
 * Creates a PolicyChangeAuditEntry for use in tests.
 * Wraps createPolicyChangeAuditEntry with test-friendly defaults.
 *
 * @example
 * ```ts
 * const entry = createTestPolicyChangeAuditEntry({ changeType: "update" });
 * expect(entry.changeType).toBe("update");
 * ```
 */
export function createTestPolicyChangeAuditEntry(
  overrides: Partial<{
    subjectId: string;
    changeType: PolicyChangeAuditEntry["changeType"];
    portName: string;
    scopeId: string;
    changeControlId: string;
    previousPolicyHash: string;
    newPolicyHash: string;
    approvedBy: string;
  }> = {},
): PolicyChangeAuditEntry {
  return createPolicyChangeAuditEntry({
    subjectId: overrides.subjectId ?? "test-admin",
    changeType: overrides.changeType ?? "update",
    portName: overrides.portName ?? "TestPort",
    scopeId: overrides.scopeId ?? "test-scope",
    changeControlId: overrides.changeControlId,
    previousPolicyHash: overrides.previousPolicyHash,
    newPolicyHash: overrides.newPolicyHash,
    approvedBy: overrides.approvedBy,
  });
}
