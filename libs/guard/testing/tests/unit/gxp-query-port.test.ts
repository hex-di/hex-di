import { describe, it, expect } from "vitest";
import { createMemoryAuditTrail } from "../../src/memory/audit-trail.js";
import type { AuditQueryPort, AuditEntry } from "@hex-di/guard";

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    evaluationId: "eval-1",
    timestamp: "2026-02-21T10:00:00.000Z",
    subjectId: "user-1",
    authenticationMethod: "password",
    policy: "hasPermission",
    decision: "allow",
    portName: "TestPort",
    scopeId: "scope-1",
    reason: "",
    durationMs: 5,
    schemaVersion: 1,
    ...overrides,
  };
}
describe("AuditQueryPort — DoD 13 tests 60-65", () => {
  // Test 60: MemoryAuditTrail implements AuditQueryPort interface
  it("test 60: createMemoryAuditTrail() implements AuditQueryPort", () => {
    const trail = createMemoryAuditTrail();
    const queryPort: AuditQueryPort = trail;
    expect(typeof queryPort.queryByEvaluationId).toBe("function");
    expect(typeof queryPort.queryBySubjectId).toBe("function");
    expect(typeof queryPort.queryByTimeRange).toBe("function");
    expect(typeof queryPort.queryByPortName).toBe("function");
    expect(typeof queryPort.exportEntries).toBe("function");
  });
  // Test 61: queryByEvaluationId() returns the matching entry or undefined
  it("test 61: queryByEvaluationId returns the matching entry or undefined", () => {
    const trail = createMemoryAuditTrail();
    const entry = makeEntry({ evaluationId: "eval-abc" });
    trail.record(entry);
    expect(trail.queryByEvaluationId("eval-abc")).toEqual(entry);
    expect(trail.queryByEvaluationId("eval-xyz")).toBeUndefined();
  });
  // Test 62: queryBySubjectId() returns all entries for a given subject
  it("test 62: queryBySubjectId returns all entries for a given subjectId", () => {
    const trail = createMemoryAuditTrail();
    const e1 = makeEntry({ subjectId: "user-1", evaluationId: "eval-1" });
    const e2 = makeEntry({ subjectId: "user-2", evaluationId: "eval-2" });
    const e3 = makeEntry({ subjectId: "user-1", evaluationId: "eval-3" });
    trail.record(e1);
    trail.record(e2);
    trail.record(e3);
    const results = trail.queryBySubjectId("user-1");
    expect(results).toHaveLength(2);
    expect(results.map((entry: AuditEntry) => entry.evaluationId).sort()).toEqual(["eval-1", "eval-3"]);
  });
  // Test 63: queryByTimeRange(from, to) returns entries within the time range
  it("test 63: queryByTimeRange returns entries within the specified time range", () => {
    const trail = createMemoryAuditTrail();
    const e1 = makeEntry({ timestamp: "2026-02-21T09:00:00.000Z", evaluationId: "eval-early" });
    const e2 = makeEntry({ timestamp: "2026-02-21T10:00:00.000Z", evaluationId: "eval-mid" });
    const e3 = makeEntry({ timestamp: "2026-02-21T11:00:00.000Z", evaluationId: "eval-late" });
    trail.record(e1);
    trail.record(e2);
    trail.record(e3);
    const results = trail.queryByTimeRange("2026-02-21T09:30:00.000Z", "2026-02-21T10:30:00.000Z");
    expect(results).toHaveLength(1);
    expect(results[0]?.evaluationId).toBe("eval-mid");
  });
  // Test 64: queryByPortName() returns all entries for a given port name
  it("test 64: queryByPortName returns all entries for a given portName", () => {
    const trail = createMemoryAuditTrail();
    const e1 = makeEntry({ portName: "OrderPort", evaluationId: "eval-1" });
    const e2 = makeEntry({ portName: "UserPort", evaluationId: "eval-2" });
    const e3 = makeEntry({ portName: "OrderPort", evaluationId: "eval-3" });
    trail.record(e1);
    trail.record(e2);
    trail.record(e3);
    const results = trail.queryByPortName("OrderPort");
    expect(results).toHaveLength(2);
    expect(results.map((entry: AuditEntry) => entry.evaluationId).sort()).toEqual(["eval-1", "eval-3"]);
  });
  // Test 65: exportEntries({ format: "json" }) returns a valid JSON string of the entries
  it("test 65: exportEntries with format json returns a valid JSON array string", () => {
    const trail = createMemoryAuditTrail();
    const e1 = makeEntry({ evaluationId: "eval-1" });
    const e2 = makeEntry({ evaluationId: "eval-2" });
    trail.record(e1);
    trail.record(e2);
    const json = trail.exportEntries({ format: "json" });
    expect(typeof json).toBe("string");
    const parsed: unknown = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    if (Array.isArray(parsed)) {
      expect(parsed).toHaveLength(2);
    }
  });
});
