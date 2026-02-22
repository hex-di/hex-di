import { describe, it, expect } from "vitest";
import { createMemoryAuditTrail } from "../../src/memory/audit-trail.js";
import { createTestAuditEntry } from "../../src/testing/audit.js";

describe("MemoryAuditTrail — validateEntry()", () => {
  it("returns valid=true for a well-formed entry", () => {
    const trail = createMemoryAuditTrail();
    const entry = createTestAuditEntry();
    const result = trail.validateEntry(entry);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid=false for missing subjectId", () => {
    const trail = createMemoryAuditTrail();
    const entry = createTestAuditEntry({ subjectId: "" });
    const result = trail.validateEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("subjectId"))).toBe(true);
  });

  it("returns valid=false for invalid timestamp", () => {
    const trail = createMemoryAuditTrail();
    const entry = createTestAuditEntry({ timestamp: "not-a-date" });
    const result = trail.validateEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("timestamp"))).toBe(true);
  });

  it("result is frozen", () => {
    const trail = createMemoryAuditTrail();
    const result = trail.validateEntry(createTestAuditEntry());
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("validates unknown schemaVersion as invalid", () => {
    const trail = createMemoryAuditTrail();
    const entry = createTestAuditEntry({ schemaVersion: 99 });
    const result = trail.validateEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("schemaVersion"))).toBe(true);
  });
});

describe("MemoryAuditTrail — validateChain()", () => {
  it("returns empty array when all entries are valid", () => {
    const trail = createMemoryAuditTrail();
    trail.record(createTestAuditEntry());
    trail.record(createTestAuditEntry());
    const invalid = trail.validateChain();
    expect(invalid).toHaveLength(0);
  });

  it("returns invalid entries when one is malformed", () => {
    const trail = createMemoryAuditTrail();
    trail.record(createTestAuditEntry());
    trail.record(createTestAuditEntry({ subjectId: "" })); // invalid
    const invalid = trail.validateChain();
    expect(invalid).toHaveLength(1);
  });

  it("returns empty array when trail has no entries", () => {
    const trail = createMemoryAuditTrail();
    expect(trail.validateChain()).toHaveLength(0);
  });
});

describe("MemoryAuditTrail — assertAllEntriesValid()", () => {
  it("does not throw when all entries are valid", () => {
    const trail = createMemoryAuditTrail();
    trail.record(createTestAuditEntry({ decision: "allow" }));
    trail.record(createTestAuditEntry({ decision: "deny" }));
    expect(() => trail.assertAllEntriesValid()).not.toThrow();
  });

  it("throws when an entry has missing required field", () => {
    const trail = createMemoryAuditTrail();
    trail.record(createTestAuditEntry({ subjectId: "" }));
    expect(() => trail.assertAllEntriesValid()).toThrow();
  });

  it("does not throw on empty trail", () => {
    const trail = createMemoryAuditTrail();
    expect(() => trail.assertAllEntriesValid()).not.toThrow();
  });
});

describe("createTestAuditEntry() — testMode flag", () => {
  it("includes testMode: true by default", () => {
    const entry = createTestAuditEntry();
    expect(entry.testMode).toBe(true);
  });

  it("can be overridden in overrides", () => {
    const entry = createTestAuditEntry({ decision: "deny" });
    expect(entry.testMode).toBe(true);
    expect(entry.decision).toBe("deny");
  });
});
