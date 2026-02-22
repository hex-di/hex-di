import { describe, it, expect } from "vitest";
import { createMemoryAuditTrail } from "../../src/memory/audit-trail.js";
import { createTestAuditEntry } from "../../src/testing/audit.js";

describe("createMemoryAuditTrail()", () => {
  it("starts with empty entries", () => {
    const trail = createMemoryAuditTrail();
    expect(trail.entries).toHaveLength(0);
  });

  it("record() returns Ok", () => {
    const trail = createMemoryAuditTrail();
    const entry = createTestAuditEntry();
    const result = trail.record(entry);
    expect(result.isOk()).toBe(true);
  });

  it("stores recorded entries", () => {
    const trail = createMemoryAuditTrail();
    const entry = createTestAuditEntry({ subjectId: "alice" });
    trail.record(entry);
    expect(trail.entries).toHaveLength(1);
    expect(trail.entries[0]?.subjectId).toBe("alice");
  });

  it("preserves insertion order", () => {
    const trail = createMemoryAuditTrail();
    trail.record(createTestAuditEntry({ subjectId: "first" }));
    trail.record(createTestAuditEntry({ subjectId: "second" }));
    trail.record(createTestAuditEntry({ subjectId: "third" }));
    const ids = trail.entries.map((e) => e.subjectId);
    expect(ids).toEqual(["first", "second", "third"]);
  });

  describe("getBySubject()", () => {
    it("returns only entries for the given subject", () => {
      const trail = createMemoryAuditTrail();
      trail.record(createTestAuditEntry({ subjectId: "alice" }));
      trail.record(createTestAuditEntry({ subjectId: "bob" }));
      trail.record(createTestAuditEntry({ subjectId: "alice" }));

      const aliceEntries = trail.getBySubject("alice");
      expect(aliceEntries).toHaveLength(2);
      expect(aliceEntries.every((e) => e.subjectId === "alice")).toBe(true);
    });

    it("returns empty array for unknown subject", () => {
      const trail = createMemoryAuditTrail();
      expect(trail.getBySubject("unknown")).toHaveLength(0);
    });
  });

  describe("getByPort()", () => {
    it("returns only entries for the given port", () => {
      const trail = createMemoryAuditTrail();
      trail.record(createTestAuditEntry({ portName: "UserRepo" }));
      trail.record(createTestAuditEntry({ portName: "OrderRepo" }));
      trail.record(createTestAuditEntry({ portName: "UserRepo" }));

      const userEntries = trail.getByPort("UserRepo");
      expect(userEntries).toHaveLength(2);
    });

    it("returns empty array for unknown port", () => {
      const trail = createMemoryAuditTrail();
      expect(trail.getByPort("UnknownPort")).toHaveLength(0);
    });
  });

  describe("getByDecision()", () => {
    it("returns only allow entries", () => {
      const trail = createMemoryAuditTrail();
      trail.record(createTestAuditEntry({ decision: "allow" }));
      trail.record(createTestAuditEntry({ decision: "deny" }));
      trail.record(createTestAuditEntry({ decision: "allow" }));

      const allows = trail.getByDecision("allow");
      expect(allows).toHaveLength(2);
    });

    it("returns only deny entries", () => {
      const trail = createMemoryAuditTrail();
      trail.record(createTestAuditEntry({ decision: "allow" }));
      trail.record(createTestAuditEntry({ decision: "deny" }));

      const denies = trail.getByDecision("deny");
      expect(denies).toHaveLength(1);
    });
  });

  describe("clear()", () => {
    it("removes all entries", () => {
      const trail = createMemoryAuditTrail();
      trail.record(createTestAuditEntry());
      trail.record(createTestAuditEntry());
      trail.clear();
      expect(trail.entries).toHaveLength(0);
    });

    it("allows new entries after clearing", () => {
      const trail = createMemoryAuditTrail();
      trail.record(createTestAuditEntry());
      trail.clear();
      trail.record(createTestAuditEntry({ subjectId: "new-user" }));
      expect(trail.entries).toHaveLength(1);
      expect(trail.entries[0]?.subjectId).toBe("new-user");
    });
  });
});
