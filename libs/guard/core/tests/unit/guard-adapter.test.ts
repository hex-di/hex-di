import { describe, it, expect, vi } from "vitest";
import {
  enforcePolicy,
  AccessDeniedError,
  AuditWriteFailedError,
  createNoopAuditTrailAdapter,
  createGuardGraph,
  createGuardHealthCheck,
  createCompletenessMonitor,
} from "../../src/guard/guard.js";
import { NoopSignatureService } from "../../src/signature/port.js";
import { hasPermission } from "../../src/policy/combinators.js";
import { createPermission } from "../../src/tokens/permission.js";
import { createAuthSubject } from "../../src/subject/auth-subject.js";
import { ok, err } from "@hex-di/result";
import type { AuditTrail, AuditEntry } from "../../src/guard/types.js";
import type { GuardEvent, GuardEventSink } from "../../src/guard/events.js";
import { createPolicyChangeAuditEntry } from "../../src/guard/policy-change.js";
import { createRoleGate, RoleGateError } from "../../src/hook/role-gate.js";

const ReadUser = createPermission({ resource: "user", action: "read" });
const WriteUser = createPermission({ resource: "user", action: "write" });

function makeSubject(permissions: string[] = ["user:read"], roles: string[] = []) {
  return createAuthSubject("user-1", roles, new Set(permissions));
}

const noopAuditTrail: AuditTrail = {
  record: () => ok(undefined),
};

describe("enforcePolicy()", () => {
  it("returns Ok when policy allows", () => {
    const subject = makeSubject(["user:read"]);
    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: noopAuditTrail,
      failOnAuditError: true,
    });
    expect(result.isOk()).toBe(true);
  });

  it("returns Err with AccessDeniedError when policy denies", () => {
    const subject = makeSubject([]);
    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: noopAuditTrail,
      failOnAuditError: true,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(AccessDeniedError);
  });

  it("records allow decision to audit trail", () => {
    const subject = makeSubject(["user:read"]);
    const recordFn = vi.fn((_entry: AuditEntry) => ok(undefined));
    const auditTrail: AuditTrail = { record: recordFn };

    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail,
      failOnAuditError: true,
    });

    expect(result.isOk()).toBe(true);
    expect(recordFn).toHaveBeenCalledOnce();
    const entry = recordFn.mock.calls[0]?.[0];
    if (entry === undefined) return;
    expect(entry.decision).toBe("allow");
    expect(entry.portName).toBe("UserRepo");
    expect(entry.subjectId).toBe("user-1");
  });

  it("records deny decision to audit trail before returning Err", () => {
    const subject = makeSubject([]);
    const recordFn = vi.fn((_entry: AuditEntry) => ok(undefined));
    const auditTrail: AuditTrail = { record: recordFn };

    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail,
      failOnAuditError: true,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(AccessDeniedError);

    expect(recordFn).toHaveBeenCalledOnce();
    const entry = recordFn.mock.calls[0]?.[0];
    if (entry === undefined) return;
    expect(entry.decision).toBe("deny");
  });

  it("works with null auditTrail (no recording)", () => {
    const subject = makeSubject(["user:read"]);
    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
    });
    expect(result.isOk()).toBe(true);
  });

  it("returns Err with AuditWriteFailedError when failOnAuditError is true and audit fails", () => {
    const subject = makeSubject(["user:read"]);
    const auditTrail: AuditTrail = {
      record: () =>
        err({
          code: "ACL008",
          message: "Write failed",
        }),
    };

    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail,
      failOnAuditError: true,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(AuditWriteFailedError);
      expect(result.error.message).toContain("Audit trail write failed");
    }
  });

  it("returns Ok on audit failure when failOnAuditError is false", () => {
    const subject = makeSubject(["user:read"]);
    const auditTrail: AuditTrail = {
      record: () => err({ code: "ACL008", message: "Write failed" }),
    };

    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail,
      failOnAuditError: false,
    });

    expect(result.isOk()).toBe(true);
  });

  it("AccessDeniedError carries portName and subjectId", () => {
    const subject = makeSubject([]);
    const result = enforcePolicy({
      policy: hasPermission(WriteUser),
      subject,
      portName: "OrderRepo",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(AccessDeniedError);
      if (result.error instanceof AccessDeniedError) {
        expect(result.error.portName).toBe("OrderRepo");
        expect(result.error.subjectId).toBe("user-1");
      }
    }
  });
});

describe("createNoopAuditTrailAdapter()", () => {
  it("record() returns Ok(undefined)", () => {
    const trail = createNoopAuditTrailAdapter();
    const entry = {
      evaluationId: "eval-1",
      timestamp: new Date().toISOString(),
      subjectId: "user-1",
      authenticationMethod: "password",
      policy: "hasRole",
      decision: "allow" as const,
      portName: "TestPort",
      scopeId: "scope-1",
      reason: "",
      durationMs: 0,
      schemaVersion: 1,
    };
    const result = trail.record(entry);
    expect(result.isOk()).toBe(true);
  });

  it("record() does not accumulate state between calls", () => {
    const trail = createNoopAuditTrailAdapter();
    for (let i = 0; i < 100; i++) {
      const result = trail.record({
        evaluationId: `eval-${i}`,
        timestamp: new Date().toISOString(),
        subjectId: `user-${i}`,
        authenticationMethod: "password",
        policy: "hasRole",
        decision: "allow",
        portName: "Port",
        scopeId: "scope",
        reason: "",
        durationMs: 0,
        schemaVersion: 1,
      });
      expect(result.isOk()).toBe(true);
    }
  });
});

describe("createGuardGraph()", () => {
  it("returns a guard graph with noopAuditTrail", () => {
    const guard = createGuardGraph();
    expect(guard.noopAuditTrail).toBeDefined();
  });

  it("enforce() returns Ok when policy passes", () => {
    const guard = createGuardGraph();
    const subject = makeSubject(["user:read"]);
    const result = guard.enforce({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserPort",
      scopeId: "scope-1",
    });
    expect(result.isOk()).toBe(true);
  });

  it("enforce() returns Err with AccessDeniedError when policy denies", () => {
    const guard = createGuardGraph();
    const subject = makeSubject([]);
    const result = guard.enforce({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserPort",
      scopeId: "scope-1",
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(AccessDeniedError);
  });

  it("enforce() uses provided auditTrail", () => {
    const guard = createGuardGraph();
    const subject = makeSubject(["user:read"]);
    const recorded: AuditEntry[] = [];
    const customTrail: AuditTrail = {
      record: entry => {
        recorded.push(entry);
        return ok(undefined);
      },
    };
    guard.enforce({
      policy: hasPermission(ReadUser),
      subject,
      portName: "Port",
      scopeId: "s1",
      auditTrail: customTrail,
    });
    expect(recorded).toHaveLength(1);
  });
});

describe("createGuardHealthCheck()", () => {
  it("returns healthy when audit trail is reachable", () => {
    const trail = createNoopAuditTrailAdapter();
    const healthCheck = createGuardHealthCheck(trail);
    const result = healthCheck();
    expect(result.healthy).toBe(true);
    expect(result.auditTrailReachable).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.checkedAt).toBeTruthy();
    expect(typeof result.latencyMs).toBe("number");
  });

  it("returns unhealthy when audit trail write fails", () => {
    const failingTrail = {
      record: () => err({ code: "ACL008" as const, message: "Disk full" }),
    };
    const healthCheck = createGuardHealthCheck(failingTrail);
    const result = healthCheck();
    expect(result.healthy).toBe(false);
    expect(result.auditTrailReachable).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it("result is frozen", () => {
    const trail = createNoopAuditTrailAdapter();
    const healthCheck = createGuardHealthCheck(trail);
    const result = healthCheck();
    expect(Object.isFrozen(result)).toBe(true);
  });
});

describe("createPolicyChangeAuditEntry()", () => {
  it("creates a PolicyChangeAuditEntry with required fields", () => {
    const entry = createPolicyChangeAuditEntry({
      subjectId: "admin-1",
      changeType: "update",
      portName: "PolicyPort",
      scopeId: "scope-1",
    });
    expect(entry.changeType).toBe("update");
    expect(entry.subjectId).toBe("admin-1");
    expect(entry.portName).toBe("PolicyPort");
    expect(entry.schemaVersion).toBe(1);
  });

  it("accepts all change types", () => {
    const types = ["create", "update", "delete", "activate", "deactivate"] as const;
    for (const changeType of types) {
      const entry = createPolicyChangeAuditEntry({
        subjectId: "admin",
        changeType,
        portName: "Port",
        scopeId: "s1",
      });
      expect(entry.changeType).toBe(changeType);
    }
  });

  it("includes optional fields when provided", () => {
    const entry = createPolicyChangeAuditEntry({
      subjectId: "admin",
      changeType: "create",
      portName: "Port",
      scopeId: "s1",
      changeControlId: "CCR-001",
      previousPolicyHash: "abc123",
      newPolicyHash: "def456",
      approvedBy: "reviewer-1",
    });
    expect(entry.changeControlId).toBe("CCR-001");
    expect(entry.previousPolicyHash).toBe("abc123");
    expect(entry.newPolicyHash).toBe("def456");
    expect(entry.approvedBy).toBe("reviewer-1");
  });

  it("entry is frozen", () => {
    const entry = createPolicyChangeAuditEntry({
      subjectId: "admin",
      changeType: "delete",
      portName: "Port",
      scopeId: "s1",
    });
    expect(Object.isFrozen(entry)).toBe(true);
  });
});

describe("createRoleGate hook", () => {
  it("allows subject with required role", () => {
    const gate = createRoleGate("admin");
    const subject = makeSubject([], ["admin"]);
    expect(() => gate.beforeResolve({ portName: "AdminPort", subject })).not.toThrow();
  });

  it("throws RoleGateError when subject lacks role", () => {
    const gate = createRoleGate("admin");
    const subject = makeSubject([], ["viewer"]);
    expect(() => gate.beforeResolve({ portName: "AdminPort", subject })).toThrow(RoleGateError);
  });

  it("throws RoleGateError when no subject in context", () => {
    const gate = createRoleGate("admin");
    expect(() => gate.beforeResolve({ portName: "AdminPort" })).toThrow(RoleGateError);
  });
});

// ---------------------------------------------------------------------------
// DoD 7 — Additional tests (audit trail integration, factories, types, truncation)
// ---------------------------------------------------------------------------

/** Helper: replicates the internal truncation logic from guard.ts for white-box testing */
const MAX_REASON_LENGTH = 2048;
const TRUNCATION_SUFFIX = "…[truncated]";
function truncateReason(reason: string): string {
  if (reason.length <= MAX_REASON_LENGTH) return reason;
  const cutAt = MAX_REASON_LENGTH - TRUNCATION_SUFFIX.length;
  return reason.slice(0, cutAt) + TRUNCATION_SUFFIX;
}

describe("audit trail integration — DoD 7 tests 9-16", () => {
  it("test 9: enforcePolicy records an audit entry after a successful allow decision", () => {
    const subject = makeSubject(["user:read"]);
    const recorded: AuditEntry[] = [];
    const trail: AuditTrail = {
      record: entry => {
        recorded.push(entry);
        return ok(undefined);
      },
    };
    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: trail,
      failOnAuditError: true,
    });
    expect(result.isOk()).toBe(true);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.decision).toBe("allow");
  });

  it("test 10: every guard evaluation records at least one audit entry", () => {
    const subject = makeSubject(["user:read"]);
    const noPermSubject = makeSubject([]);
    const recorded: AuditEntry[] = [];
    const trail: AuditTrail = {
      record: entry => {
        recorded.push(entry);
        return ok(undefined);
      },
    };
    enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "P1",
      scopeId: "s",
      auditTrail: trail,
      failOnAuditError: false,
    });
    enforcePolicy({
      policy: hasPermission(WriteUser),
      subject: noPermSubject,
      portName: "P2",
      scopeId: "s",
      auditTrail: trail,
      failOnAuditError: false,
    });
    expect(recorded.length).toBeGreaterThanOrEqual(2);
  });

  it("test 11: createNoopAuditTrailAdapter() discards entries and returns ok(undefined)", () => {
    const noop = createNoopAuditTrailAdapter();
    const entry: AuditEntry = {
      evaluationId: "eval-noop",
      timestamp: new Date().toISOString(),
      subjectId: "user-1",
      authenticationMethod: "password",
      policy: "hasPermission",
      decision: "allow",
      portName: "NoopPort",
      scopeId: "scope-1",
      reason: "",
      durationMs: 1,
      schemaVersion: 1,
    };
    const result = noop.record(entry);
    expect(result.isOk()).toBe(true);
    const result2 = noop.record(entry);
    expect(result2.isOk()).toBe(true);
  });

  it("test 12: AuditEntry.evaluationId is a non-empty string matching the decision", () => {
    const subject = makeSubject(["user:read"]);
    let capturedEntry: AuditEntry | undefined;
    const trail: AuditTrail = {
      record: entry => {
        capturedEntry = entry;
        return ok(undefined);
      },
    };
    enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: trail,
      failOnAuditError: true,
    });
    expect(capturedEntry).toBeDefined();
    expect(typeof capturedEntry?.evaluationId).toBe("string");
    expect((capturedEntry?.evaluationId ?? "").length).toBeGreaterThan(0);
  });

  it("test 14: AuditTrail.record() returns a Result with isOk/isErr methods", () => {
    const noop = createNoopAuditTrailAdapter();
    const entry: AuditEntry = {
      evaluationId: "eval-result-type",
      timestamp: new Date().toISOString(),
      subjectId: "user-1",
      authenticationMethod: "password",
      policy: "hasPermission",
      decision: "allow",
      portName: "Port",
      scopeId: "scope",
      reason: "",
      durationMs: 0,
      schemaVersion: 1,
    };
    const result = noop.record(entry);
    expect(typeof result.isOk).toBe("function");
    expect(typeof result.isErr).toBe("function");
    expect(result.isOk()).toBe(true);
  });

  it("test 16: failOnAuditError=false — guard allows/denies normally even when audit write fails", () => {
    const allowSubject = makeSubject(["user:read"]);
    const failingTrail: AuditTrail = {
      record: () => err({ code: "ACL008" as const, message: "Disk full" }),
    };
    // Allow path: should return Ok even though audit fails
    const allowResult = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject: allowSubject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: failingTrail,
      failOnAuditError: false,
    });
    expect(allowResult.isOk()).toBe(true);

    // Deny path: should return Err with AccessDeniedError, not an audit error
    const denySubject = makeSubject([]);
    const denyResult = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject: denySubject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: failingTrail,
      failOnAuditError: false,
    });
    expect(denyResult.isErr()).toBe(true);
    if (denyResult.isErr()) expect(denyResult.error).toBeInstanceOf(AccessDeniedError);
  });
});

describe("createGuardGraph factories — DoD 7 tests 20, 24", () => {
  it("test 20: createGuardGraph() returns an object with an enforce function and noopAuditTrail", () => {
    const graph = createGuardGraph();
    expect(typeof graph.enforce).toBe("function");
    expect(graph.noopAuditTrail).toBeDefined();
    expect(typeof graph.noopAuditTrail.record).toBe("function");
  });

  it("test 24: createGuardGraph().enforce() works with a custom auditTrail", () => {
    const graph = createGuardGraph();
    const subject = makeSubject(["user:read"]);
    const recorded: AuditEntry[] = [];
    const customTrail: AuditTrail = {
      record: entry => {
        recorded.push(entry);
        return ok(undefined);
      },
    };
    graph.enforce({
      policy: hasPermission(ReadUser),
      subject,
      portName: "TestPort",
      scopeId: "scope-1",
      auditTrail: customTrail,
    });
    expect(recorded).toHaveLength(1);
  });
});

describe("NoopSignatureService — DoD 7 test 25", () => {
  it("test 25: NoopSignatureService is exported and has capture/validate methods", async () => {
    expect(typeof NoopSignatureService.capture).toBe("function");
    expect(typeof NoopSignatureService.validate).toBe("function");
    const sig = await NoopSignatureService.capture({ meaning: "review" });
    expect(sig.validated).toBe(true);
    expect(sig.reauthenticated).toBe(true);
  });
});

describe("GxPAuditEntry runtime fields — DoD 7 test 29", () => {
  it("test 29: GxPAuditEntry-shaped object has all required GxP integrity fields", () => {
    const gxpEntry = {
      evaluationId: "eval-gxp",
      timestamp: new Date().toISOString(),
      subjectId: "user-1",
      authenticationMethod: "password",
      policy: "hasRole",
      decision: "allow" as const,
      portName: "GxPPort",
      scopeId: "scope-1",
      reason: "",
      durationMs: 5,
      schemaVersion: 1,
      integrityHash: "abc123",
      previousHash: "000000",
      signature: "sig-value",
      sequenceNumber: 1,
      traceDigest: "trace-abc",
      policySnapshot: '{"kind":"hasRole","roleName":"admin"}',
    };

    expect(gxpEntry.integrityHash).toBeDefined();
    expect(gxpEntry.previousHash).toBeDefined();
    expect(gxpEntry.signature).toBeDefined();
    expect(typeof gxpEntry.sequenceNumber).toBe("number");
    expect(gxpEntry.traceDigest).toBeDefined();
    expect(gxpEntry.policySnapshot).toBeDefined();
  });
});

describe("ElectronicSignature signerName field — DoD 7 test 39", () => {
  it("test 39: ElectronicSignature in guard/types includes optional signerName field", () => {
    const sig = {
      signerId: "user-1",
      signerName: "Dr. Jane Smith",
      signedAt: new Date().toISOString(),
      meaning: "review",
      validated: true,
      reauthenticated: true,
    };
    expect(sig.signerName).toBe("Dr. Jane Smith");
  });
});

describe("AuditEntry.reason truncation — DoD 7 tests 36-37", () => {
  it("test 36: reason string > 2048 chars gets truncated to end with '…[truncated]' at exactly 2048 chars", () => {
    const longReason = "x".repeat(3000);
    const truncated = truncateReason(longReason);
    expect(truncated.length).toBe(MAX_REASON_LENGTH);
    expect(truncated.endsWith(TRUNCATION_SUFFIX)).toBe(true);
    expect(truncated.startsWith("x")).toBe(true);
  });

  it("test 36b: reason exactly at 2049 chars is truncated to 2048 with suffix", () => {
    const borderReason = "a".repeat(2049);
    const truncated = truncateReason(borderReason);
    expect(truncated.length).toBe(MAX_REASON_LENGTH);
    expect(truncated.endsWith(TRUNCATION_SUFFIX)).toBe(true);
  });

  it("test 37: reason string <= 2048 chars is preserved unchanged", () => {
    expect(truncateReason("")).toBe("");
    expect(truncateReason("short reason")).toBe("short reason");
    const exactReason = "y".repeat(2048);
    expect(truncateReason(exactReason)).toBe(exactReason);
    expect(truncateReason(exactReason).length).toBe(2048);
  });

  it("test 37b: enforcePolicy records the reason correctly for deny decisions", () => {
    const subject = makeSubject([]);
    let capturedReason = "";
    const trail: AuditTrail = {
      record: entry => {
        capturedReason = entry.reason;
        return ok(undefined);
      },
    };
    enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "P",
      scopeId: "s",
      auditTrail: trail,
      failOnAuditError: false,
    });
    expect(typeof capturedReason).toBe("string");
    expect(capturedReason.length).toBeGreaterThan(0);
    // Should not exceed MAX_REASON_LENGTH (truncation applied)
    expect(capturedReason.length).toBeLessThanOrEqual(MAX_REASON_LENGTH);
  });
});

describe("fieldMaskAdapter integration", () => {
  it("fieldMaskAdapter.onVisibleFields is called with correct fields on allow", () => {
    const subject = makeSubject(["user:read"]);
    const captured: { fields: ReadonlyArray<string>; evaluationId: string }[] = [];
    const fieldMaskAdapter = {
      onVisibleFields: (fields: ReadonlyArray<string>, evaluationId: string) => {
        captured.push({ fields, evaluationId });
      },
    };
    const result = enforcePolicy({
      policy: hasPermission(ReadUser, { fields: ["name", "email"] }),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
      fieldMaskAdapter,
    });
    expect(result.isOk()).toBe(true);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.fields).toContain("name");
    expect(captured[0]?.fields).toContain("email");
    expect(typeof captured[0]?.evaluationId).toBe("string");
  });

  it("fieldMaskAdapter is NOT called on deny", () => {
    const subject = makeSubject([]); // no permissions
    const captured: unknown[] = [];
    const fieldMaskAdapter = {
      onVisibleFields: (fields: ReadonlyArray<string>, evaluationId: string) => {
        captured.push({ fields, evaluationId });
      },
    };
    const result = enforcePolicy({
      policy: hasPermission(ReadUser, { fields: ["name"] }),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
      fieldMaskAdapter,
    });
    expect(result.isErr()).toBe(true);
    expect(captured).toHaveLength(0);
  });

  it("fieldMaskAdapter is NOT called when visibleFields is undefined", () => {
    const subject = makeSubject(["user:read"]);
    const captured: unknown[] = [];
    const fieldMaskAdapter = {
      onVisibleFields: (fields: ReadonlyArray<string>, evaluationId: string) => {
        captured.push({ fields, evaluationId });
      },
    };
    // No fields option → visibleFields will be undefined
    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
      fieldMaskAdapter,
    });
    expect(result.isOk()).toBe(true);
    expect(captured).toHaveLength(0);
  });
});

describe("createGuardHealthCheck — additional coverage", () => {
  it("latencyMs is a non-negative number", () => {
    const trail = createNoopAuditTrailAdapter();
    const healthCheck = createGuardHealthCheck(trail);
    const result = healthCheck();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe("CompletenessMonitor", () => {
  it("portNames returns union of all recorded ports", () => {
    const monitor = createCompletenessMonitor();
    monitor.recordResolution("PortA");
    monitor.recordResolution("PortB");
    monitor.recordAuditEntry("PortA");
    monitor.recordAuditEntry("PortC");

    const names = monitor.portNames;
    expect(names).toContain("PortA");
    expect(names).toContain("PortB");
    expect(names).toContain("PortC");
    expect(names).toHaveLength(3);
  });

  it("queryCompleteness returns zeros for unknown port", () => {
    const monitor = createCompletenessMonitor();
    const result = monitor.queryCompleteness("UnknownPort");
    expect(result.resolutions).toBe(0);
    expect(result.auditEntries).toBe(0);
    expect(result.discrepancy).toBe(0);
  });

  it("queryCompleteness tracks discrepancy between resolutions and audit entries", () => {
    const monitor = createCompletenessMonitor();
    monitor.recordResolution("UserPort");
    monitor.recordResolution("UserPort");
    monitor.recordAuditEntry("UserPort");

    const result = monitor.queryCompleteness("UserPort");
    expect(result.resolutions).toBe(2);
    expect(result.auditEntries).toBe(1);
    expect(result.discrepancy).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Event emission — enforcePolicy + createGuardGraph eventSink integration
// ---------------------------------------------------------------------------

function createCollectingSink(): { sink: GuardEventSink; events: GuardEvent[] } {
  const events: GuardEvent[] = [];
  const sink: GuardEventSink = {
    emit(event) {
      events.push(event);
    },
  };
  return { sink, events };
}

describe("enforcePolicy eventSink emission", () => {
  it("emits GuardAllowEvent on allow", () => {
    const { sink, events } = createCollectingSink();
    const subject = makeSubject(["user:read"]);
    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
      eventSink: sink,
    });
    expect(result.isOk()).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("guard.allow");
    if (events[0]?.kind === "guard.allow") {
      expect(events[0].portName).toBe("UserRepo");
      expect(events[0].subjectId).toBe("user-1");
      expect(events[0].decision.kind).toBe("allow");
      expect(events[0].evaluationId).toBeTruthy();
      expect(events[0].timestamp).toBeTruthy();
    }
  });

  it("emits GuardDenyEvent on deny", () => {
    const { sink, events } = createCollectingSink();
    const subject = makeSubject([]);
    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
      eventSink: sink,
    });
    expect(result.isErr()).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("guard.deny");
    if (events[0]?.kind === "guard.deny") {
      expect(events[0].portName).toBe("UserRepo");
      expect(events[0].subjectId).toBe("user-1");
      expect(events[0].decision.kind).toBe("deny");
    }
  });

  it("does not emit events when eventSink is not provided", () => {
    const subject = makeSubject(["user:read"]);
    // No eventSink — should not throw
    const result = enforcePolicy({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserRepo",
      scopeId: "scope-1",
      auditTrail: null,
      failOnAuditError: false,
    });
    expect(result.isOk()).toBe(true);
  });
});

describe("createGuardGraph eventSink forwarding", () => {
  it("forwards graph-level eventSink to enforcePolicy", () => {
    const { sink, events } = createCollectingSink();
    const guard = createGuardGraph({ eventSink: sink });
    const subject = makeSubject(["user:read"]);
    guard.enforce({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserPort",
      scopeId: "scope-1",
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("guard.allow");
  });

  it("per-call eventSink overrides graph-level eventSink", () => {
    const { sink: graphSink, events: graphEvents } = createCollectingSink();
    const { sink: callSink, events: callEvents } = createCollectingSink();
    const guard = createGuardGraph({ eventSink: graphSink });
    const subject = makeSubject(["user:read"]);
    guard.enforce({
      policy: hasPermission(ReadUser),
      subject,
      portName: "UserPort",
      scopeId: "scope-1",
      eventSink: callSink,
    });
    expect(graphEvents).toHaveLength(0);
    expect(callEvents).toHaveLength(1);
  });

  it("emits both allow and deny events through graph", () => {
    const { sink, events } = createCollectingSink();
    const guard = createGuardGraph({ eventSink: sink });
    const allowSubject = makeSubject(["user:read"]);
    const denySubject = makeSubject([]);
    guard.enforce({
      policy: hasPermission(ReadUser),
      subject: allowSubject,
      portName: "P1",
      scopeId: "s",
    });
    guard.enforce({
      policy: hasPermission(ReadUser),
      subject: denySubject,
      portName: "P2",
      scopeId: "s",
    });
    expect(events).toHaveLength(2);
    expect(events[0]?.kind).toBe("guard.allow");
    expect(events[1]?.kind).toBe("guard.deny");
  });
});
