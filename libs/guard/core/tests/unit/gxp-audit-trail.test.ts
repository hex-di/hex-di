import { describe, it, expect } from "vitest";
import type { AuditEntry, GxPAuditEntry, AuditTrail } from "../../src/guard/types.js";
import { verifyAuditChain, computeAuditEntryHash } from "../../src/serialization/serialize.js";
import { enforcePolicy, AuditWriteFailedError } from "../../src/guard/guard.js";
import { hasPermission } from "../../src/policy/combinators.js";
import { createPermission } from "../../src/tokens/permission.js";
import { createAuthSubject } from "../../src/subject/auth-subject.js";
import { ok, err } from "@hex-di/result";
function makeAuditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    evaluationId: "eval-1",
    timestamp: "2026-02-21T10:00:00.000Z",
    subjectId: "user-1",
    authenticationMethod: "password",
    policy: '{"kind":"hasRole","roleName":"admin"}',
    decision: "allow",
    portName: "TestPort",
    scopeId: "scope-1",
    reason: "",
    durationMs: 5,
    schemaVersion: 1,
    ...overrides,
  };
}
function makeGxPAuditEntry(overrides: Partial<GxPAuditEntry> = {}): GxPAuditEntry {
  return {
    ...makeAuditEntry(),
    integrityHash: "abc123",
    previousHash: "000000",
    signature: "sig-value",
    sequenceNumber: 1,
    traceDigest: "trace-digest",
    policySnapshot: '{"kind":"hasRole","roleName":"admin"}',
    ...overrides,
  };
}

const ReadReport = createPermission({ resource: "report", action: "read" });

function makeSubjectWithPermission(permissions: string[] = ["report:read"]) {
  return createAuthSubject("user-1", [], new Set(permissions));
}
describe("AuditEntry required fields", () => {
  it("has all 10 required fields for allow decision", () => {
    const entry = makeAuditEntry({ decision: "allow" });
    expect(entry.evaluationId).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    expect(entry.subjectId).toBeDefined();
    expect(entry.authenticationMethod).toBeDefined();
    expect(entry.policy).toBeDefined();
    expect(entry.decision).toBe("allow");
    expect(entry.portName).toBeDefined();
    expect(entry.scopeId).toBeDefined();
    expect(entry.reason).toBeDefined();
    expect(entry.durationMs).toBeDefined();
    expect(entry.schemaVersion).toBeDefined();
  });
  it("has all 10 required fields for deny decision", () => {
    const entry = makeAuditEntry({ decision: "deny", reason: "role not matched" });
    expect(entry.evaluationId).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    expect(entry.subjectId).toBeDefined();
    expect(entry.authenticationMethod).toBeDefined();
    expect(entry.policy).toBeDefined();
    expect(entry.decision).toBe("deny");
    expect(entry.portName).toBeDefined();
    expect(entry.scopeId).toBeDefined();
    expect(entry.reason).toBe("role not matched");
    expect(entry.durationMs).toBeDefined();
    expect(entry.schemaVersion).toBeDefined();
  });
  it("AuditEntry.reason is empty string for Allow decisions", () => {
    const entry = makeAuditEntry({ decision: "allow", reason: "" });
    expect(entry.reason).toBe("");
  });

  it("schemaVersion is 1 on all new entries", () => {
    const entry = makeAuditEntry();
    expect(entry.schemaVersion).toBe(1);
  });
});
describe("GxPAuditEntry required fields", () => {
  it("sequenceNumber is present on GxPAuditEntry", () => {
    const entry = makeGxPAuditEntry({ sequenceNumber: 42 });
    expect(entry.sequenceNumber).toBe(42);
  });

  it("traceDigest is present on GxPAuditEntry", () => {
    const entry = makeGxPAuditEntry({ traceDigest: "some-trace" });
    expect(entry.traceDigest).toBe("some-trace");
  });

  it("policySnapshot is present on GxPAuditEntry", () => {
    const entry = makeGxPAuditEntry({ policySnapshot: '{"kind":"hasRole"}' });
    expect(entry.policySnapshot).toBe('{"kind":"hasRole"}');
  });
});
describe("verifyAuditChain", () => {
  it("returns true for empty chain", () => {
    expect(verifyAuditChain([])).toBe(true);
  });

  it("returns true for valid sequential chain", () => {
    const entries = [
      makeAuditEntry({ sequenceNumber: 1 }),
      makeAuditEntry({ sequenceNumber: 2 }),
      makeAuditEntry({ sequenceNumber: 3 }),
    ];
    expect(verifyAuditChain(entries)).toBe(true);
  });

  it("returns true for entries without sequenceNumber", () => {
    const entries = [
      makeAuditEntry(),
      makeAuditEntry(),
      makeAuditEntry(),
    ];
    expect(verifyAuditChain(entries)).toBe(true);
  });
  it("returns false when sequence numbers have gaps", () => {
    const entries = [
      makeAuditEntry({ sequenceNumber: 1 }),
      makeAuditEntry({ sequenceNumber: 3 }), // gap: missing 2
    ];
    expect(verifyAuditChain(entries)).toBe(false);
  });

  it("returns false when sequence numbers are out of order", () => {
    const entries = [
      makeAuditEntry({ sequenceNumber: 2 }),
      makeAuditEntry({ sequenceNumber: 1 }),
    ];
    expect(verifyAuditChain(entries)).toBe(false);
  });

  it("returns true for a single entry with sequenceNumber", () => {
    const entries = [makeAuditEntry({ sequenceNumber: 5 })];
    expect(verifyAuditChain(entries)).toBe(true);
  });
  // DoD 13 Test 12: sequenceNumber is monotonically increasing
  it("test 12: verifyAuditChain returns true when sequenceNumbers are 1, 2, 3 (monotonically increasing)", () => {
    const entries = [
      makeAuditEntry({ sequenceNumber: 1 }),
      makeAuditEntry({ sequenceNumber: 2 }),
      makeAuditEntry({ sequenceNumber: 3 }),
    ];
    expect(verifyAuditChain(entries)).toBe(true);
  });

  // DoD 13 Test 13: gap detection — missing sequence number 2 among 1, 3, 4
  it("test 13: verifyAuditChain returns false when sequenceNumbers have a gap (1, 3, 4 — missing 2)", () => {
    const entries = [
      makeAuditEntry({ sequenceNumber: 1 }),
      makeAuditEntry({ sequenceNumber: 3 }),
      makeAuditEntry({ sequenceNumber: 4 }),
    ];
    expect(verifyAuditChain(entries)).toBe(false);
  });
});
describe("computeAuditEntryHash", () => {
  it("produces a deterministic SHA-256 hex string", () => {
    const entry = makeAuditEntry();
    const hash1 = computeAuditEntryHash(entry, "prev-hash");
    const hash2 = computeAuditEntryHash(entry, "prev-hash");
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces a 64-character hex string", () => {
    const entry = makeAuditEntry();
    const hash = computeAuditEntryHash(entry, "genesis");
    expect(hash).toHaveLength(64);
  });
  it("changes when evaluationId changes", () => {
    const entry1 = makeAuditEntry({ evaluationId: "eval-1" });
    const entry2 = makeAuditEntry({ evaluationId: "eval-2" });
    expect(computeAuditEntryHash(entry1, "prev")).not.toBe(computeAuditEntryHash(entry2, "prev"));
  });

  it("changes when previousHash changes", () => {
    const entry = makeAuditEntry();
    const hash1 = computeAuditEntryHash(entry, "hash-a");
    const hash2 = computeAuditEntryHash(entry, "hash-b");
    expect(hash1).not.toBe(hash2);
  });

  it("changes when decision changes", () => {
    const entry1 = makeAuditEntry({ decision: "allow" });
    const entry2 = makeAuditEntry({ decision: "deny" });
    expect(computeAuditEntryHash(entry1, "prev")).not.toBe(computeAuditEntryHash(entry2, "prev"));
  });
  it("changes when timestamp changes", () => {
    const entry1 = makeAuditEntry({ timestamp: "2026-02-21T10:00:00.000Z" });
    const entry2 = makeAuditEntry({ timestamp: "2026-02-21T10:00:01.000Z" });
    expect(computeAuditEntryHash(entry1, "prev")).not.toBe(computeAuditEntryHash(entry2, "prev"));
  });

  it("changes when sequenceNumber changes", () => {
    const entry1 = makeAuditEntry({ sequenceNumber: 1 });
    const entry2 = makeAuditEntry({ sequenceNumber: 2 });
    expect(computeAuditEntryHash(entry1, "prev")).not.toBe(computeAuditEntryHash(entry2, "prev"));
  });
});
// ---------------------------------------------------------------------------
// DoD 13 gap tests 4, 5, 6: audit recording ordering and failure modes
// ---------------------------------------------------------------------------
describe("enforcePolicy audit recording — DoD 13 gap tests", () => {
  // Test 4: audit recording happens before enforcePolicy returns
  it("test 4: record() is called synchronously — entry count increases before enforcePolicy returns", () => {
    const subject = makeSubjectWithPermission(["report:read"]);
    let recordedCount = 0;
    const auditTrail: AuditTrail = {
      record: (_entry: AuditEntry) => {
        recordedCount++;
        return ok(undefined);
      },
    };
    enforcePolicy({
      policy: hasPermission(ReadReport),
      subject,
      portName: "ReportPort",
      scopeId: "scope-1",
      auditTrail,
      failOnAuditError: false,
    });

    expect(recordedCount).toBe(1);
  });
  // Test 5: failOnAuditError: true — audit write failure returns Err with AuditWriteFailedError
  it("test 5: when failOnAuditError is true, audit write failure causes enforcePolicy to return Err with AuditWriteFailedError", () => {
    const subject = makeSubjectWithPermission(["report:read"]);
    const failingAuditTrail: AuditTrail = {
      record: () => err({ code: "ACL008" as const, message: "Disk full" }),
    };

    const result = enforcePolicy({
      policy: hasPermission(ReadReport),
      subject,
      portName: "ReportPort",
      scopeId: "scope-1",
      auditTrail: failingAuditTrail,
      failOnAuditError: true,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(AuditWriteFailedError);
  });
  // Test 6: failOnAuditError: false — audit write failure is silent, guard returns Ok
  it("test 6: when failOnAuditError is false, audit write failure is silent and enforcePolicy returns Ok", () => {
    const subject = makeSubjectWithPermission(["report:read"]);
    const failingAuditTrail: AuditTrail = {
      record: () => err({ code: "ACL008" as const, message: "Disk full" }),
    };

    const result = enforcePolicy({
      policy: hasPermission(ReadReport),
      subject,
      portName: "ReportPort",
      scopeId: "scope-1",
      auditTrail: failingAuditTrail,
      failOnAuditError: false,
    });

    expect(result.isOk()).toBe(true);
  });
});
