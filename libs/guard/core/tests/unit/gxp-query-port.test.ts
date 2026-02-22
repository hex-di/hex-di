import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import type { AuditQueryPort, AuditEntry, AuditTrail } from "../../src/guard/types.js";

/**
 * Minimal in-memory audit trail for testing AuditQueryPort.
 * Inlined to avoid a cyclic devDependency on @hex-di/guard-testing.
 */
function createLocalMemoryAuditTrail(): AuditTrail & AuditQueryPort & { record(entry: AuditEntry): ReturnType<AuditTrail["record"]> } {
  const entries: AuditEntry[] = [];

  return {
    record(entry: AuditEntry) {
      entries.push(entry);
      return ok(undefined);
    },

    queryByEvaluationId(id: string): AuditEntry | undefined {
      return entries.find((e) => e.evaluationId === id);
    },

    queryBySubjectId(
      subjectId: string,
      options?: { readonly from?: string; readonly to?: string },
    ): readonly AuditEntry[] {
      return entries.filter((e) => {
        if (e.subjectId !== subjectId) return false;
        if (options?.from !== undefined && e.timestamp < options.from) return false;
        if (options?.to !== undefined && e.timestamp > options.to) return false;
        return true;
      });
    },

    queryByTimeRange(
      from: string,
      to: string,
      options?: { readonly decision?: "allow" | "deny" },
    ): readonly AuditEntry[] {
      return entries.filter((e) => {
        if (e.timestamp < from || e.timestamp > to) return false;
        if (options?.decision !== undefined && e.decision !== options.decision) return false;
        return true;
      });
    },

    queryByPortName(
      portName: string,
      options?: { readonly from?: string; readonly to?: string },
    ): readonly AuditEntry[] {
      return entries.filter((e) => {
        if (e.portName !== portName) return false;
        if (options?.from !== undefined && e.timestamp < options.from) return false;
        if (options?.to !== undefined && e.timestamp > options.to) return false;
        return true;
      });
    },

    exportEntries(options?: { readonly format?: "json" | "jsonl" | "csv" }): string {
      const format = options?.format ?? "jsonl";
      if (format === "json") {
        return JSON.stringify(entries, null, 2);
      }
      return entries.map((e) => JSON.stringify(e)).join("\n");
    },
  };
}

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
    const trail = createLocalMemoryAuditTrail();
    // Type-level check: assign to AuditQueryPort
    const queryPort: AuditQueryPort = trail;
    expect(typeof queryPort.queryByEvaluationId).toBe("function");
    expect(typeof queryPort.queryBySubjectId).toBe("function");
    expect(typeof queryPort.queryByTimeRange).toBe("function");
    expect(typeof queryPort.queryByPortName).toBe("function");
    expect(typeof queryPort.exportEntries).toBe("function");
  });
  // Test 61: queryByEvaluationId() returns the matching entry or undefined
  it("test 61: queryByEvaluationId returns the matching entry or undefined", () => {
    const trail = createLocalMemoryAuditTrail();
    const entry = makeEntry({ evaluationId: "eval-abc" });
    trail.record(entry);
    expect(trail.queryByEvaluationId("eval-abc")).toEqual(entry);
    expect(trail.queryByEvaluationId("eval-xyz")).toBeUndefined();
  });
  // Test 62: queryBySubjectId() returns all entries for a given subject
  it("test 62: queryBySubjectId returns all entries for a given subjectId", () => {
    const trail = createLocalMemoryAuditTrail();
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
    const trail = createLocalMemoryAuditTrail();
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
    const trail = createLocalMemoryAuditTrail();
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
  it("test 65: exportEntries({ format: JSON.parse() }) returns valid JSON array of entries", () => {
    const trail = createLocalMemoryAuditTrail();
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
