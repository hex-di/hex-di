import { describe, it, expect } from "vitest";
import { enforceRetention, getPurgeableEntries } from "../../src/guard/retention.js";
import type { AuditEntry } from "../../src/guard/types.js";

function makeEntry(daysAgo: number, id: string = crypto.randomUUID()): AuditEntry {
  const ts = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    evaluationId: id,
    timestamp: ts,
    subjectId: "user-1",
    authenticationMethod: "password",
    policy: "hasRole",
    decision: "allow",
    portName: "TestPort",
    scopeId: "scope-1",
    reason: "Access granted",
    durationMs: 1,
    schemaVersion: 1,
  };
}

describe("enforceRetention()", () => {
  it("returns all entries when none exceed maxAgeDays", () => {
    const entries = [makeEntry(1), makeEntry(2), makeEntry(3)];
    const retained = enforceRetention(entries, { maxAgeDays: 30 });
    expect(retained).toHaveLength(3);
  });

  it("removes entries older than maxAgeDays", () => {
    const entries = [
      makeEntry(1),
      makeEntry(5),
      makeEntry(40), // too old
    ];
    const retained = enforceRetention(entries, { maxAgeDays: 30 });
    expect(retained).toHaveLength(2);
  });

  it("retains the most recent maxEntries when count limit exceeded", () => {
    const entries = [
      makeEntry(1, "id-1"),
      makeEntry(2, "id-2"),
      makeEntry(3, "id-3"),
      makeEntry(4, "id-4"),
      makeEntry(5, "id-5"),
    ];
    const retained = enforceRetention(entries, { maxAgeDays: 30, maxEntries: 3 });
    expect(retained).toHaveLength(3);
    // Should keep the 3 most recent (daysAgo: 1, 2, 3)
    const ids = retained.map((e) => e.evaluationId);
    expect(ids).toContain("id-1");
    expect(ids).toContain("id-2");
    expect(ids).toContain("id-3");
    expect(ids).not.toContain("id-4");
    expect(ids).not.toContain("id-5");
  });

  it("applies age filter before count filter", () => {
    const entries = [
      makeEntry(1, "recent-1"),
      makeEntry(2, "recent-2"),
      makeEntry(40, "old-1"), // purged by age
      makeEntry(50, "old-2"), // purged by age
    ];
    // maxEntries: 3 but only 2 remain after age filter
    const retained = enforceRetention(entries, { maxAgeDays: 30, maxEntries: 3 });
    expect(retained).toHaveLength(2);
  });

  it("returns empty array when all entries are too old", () => {
    const entries = [makeEntry(40), makeEntry(50)];
    const retained = enforceRetention(entries, { maxAgeDays: 30 });
    expect(retained).toHaveLength(0);
  });

  it("returns empty array when maxEntries is 0", () => {
    const entries = [makeEntry(1), makeEntry(2)];
    const retained = enforceRetention(entries, { maxAgeDays: 30, maxEntries: 0 });
    expect(retained).toHaveLength(0);
  });
});

describe("getPurgeableEntries()", () => {
  it("returns entries that would be removed", () => {
    const old = makeEntry(40, "old");
    const recent = makeEntry(5, "recent");
    const purgeable = getPurgeableEntries([old, recent], { maxAgeDays: 30 });
    expect(purgeable).toHaveLength(1);
    expect(purgeable[0].evaluationId).toBe("old");
  });

  it("returns empty array when nothing is purgeable", () => {
    const entries = [makeEntry(1), makeEntry(2)];
    const purgeable = getPurgeableEntries(entries, { maxAgeDays: 30 });
    expect(purgeable).toHaveLength(0);
  });

  it("boundary entry at exactly maxAgeDays is retained", () => {
    // Entry at exactly the boundary (29.9 days) should be retained
    const boundary = makeEntry(29, "boundary");
    const retained = enforceRetention([boundary], { maxAgeDays: 30 });
    expect(retained).toHaveLength(1);
  });

  it("combined maxAgeDays + maxEntries: age filter first then count limit", () => {
    const entries = [
      makeEntry(1, "a"),
      makeEntry(2, "b"),
      makeEntry(3, "c"),
      makeEntry(4, "d"),
      makeEntry(40, "old"), // removed by age
    ];
    // After age: 4 entries remain; maxEntries: 2 keeps only most recent 2
    const retained = enforceRetention(entries, { maxAgeDays: 30, maxEntries: 2 });
    expect(retained).toHaveLength(2);
    const ids = retained.map((e) => e.evaluationId);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
  });
});
