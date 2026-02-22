import { describe, it, expect } from "vitest";
import { createMemoryMetaAuditTrail } from "../../src/index.js";
import { createMetaAuditEntry, createDataClassificationChangeEntry } from "@hex-di/guard";

describe("MemoryMetaAuditTrail", () => {
  it("starts with empty entries", () => {
    const trail = createMemoryMetaAuditTrail();
    expect(trail.entries).toHaveLength(0);
    expect(trail.classificationChanges).toHaveLength(0);
  });

  it("recordAccess() stores meta-audit entries", () => {
    const trail = createMemoryMetaAuditTrail();
    const entry = createMetaAuditEntry({
      actorId: "auditor-1",
      accessType: "read",
      description: "Audit review",
      entryCount: 10,
      scope: "scope-1",
    });
    const result = trail.recordAccess(entry);
    expect(result.isOk()).toBe(true);
    expect(trail.entries).toHaveLength(1);
  });

  it("recordClassificationChange() stores change entries", () => {
    const trail = createMemoryMetaAuditTrail();
    const entry = createDataClassificationChangeEntry({
      actorId: "admin-1",
      scope: "scope-1",
      previousClassification: "internal",
      newClassification: "confidential",
      reason: "Regulatory update",
    });
    const result = trail.recordClassificationChange(entry);
    expect(result.isOk()).toBe(true);
    expect(trail.classificationChanges).toHaveLength(1);
  });

  it("queryByAccessType() filters entries", () => {
    const trail = createMemoryMetaAuditTrail();

    trail.recordAccess(createMetaAuditEntry({
      actorId: "a",
      accessType: "read",
      description: "read",
      entryCount: 1,
      scope: "s",
    }));
    trail.recordAccess(createMetaAuditEntry({
      actorId: "b",
      accessType: "export",
      description: "export",
      entryCount: 2,
      scope: "s",
    }));

    const reads = trail.queryByAccessType("read");
    expect(reads).toHaveLength(1);
    expect(reads[0].accessType).toBe("read");

    const exports = trail.queryByAccessType("export");
    expect(exports).toHaveLength(1);
  });

  it("queryByActor() filters entries by actorId", () => {
    const trail = createMemoryMetaAuditTrail();

    trail.recordAccess(createMetaAuditEntry({
      actorId: "actor-A",
      accessType: "read",
      description: "d",
      entryCount: 0,
      scope: "s",
    }));
    trail.recordAccess(createMetaAuditEntry({
      actorId: "actor-B",
      accessType: "verify",
      description: "d",
      entryCount: 0,
      scope: "s",
    }));

    const actorAEntries = trail.queryByActor("actor-A");
    expect(actorAEntries).toHaveLength(1);
    expect(actorAEntries[0].actorId).toBe("actor-A");
  });

  it("clear() removes all entries", () => {
    const trail = createMemoryMetaAuditTrail();
    trail.recordAccess(createMetaAuditEntry({
      actorId: "a",
      accessType: "read",
      description: "d",
      entryCount: 0,
      scope: "s",
    }));
    trail.clear();
    expect(trail.entries).toHaveLength(0);
  });

  it("returns err when alwaysFail is true", () => {
    const trail = createMemoryMetaAuditTrail({ alwaysFail: true });
    const entry = createMetaAuditEntry({
      actorId: "a",
      accessType: "read",
      description: "d",
      entryCount: 0,
      scope: "s",
    });
    const result = trail.recordAccess(entry);
    expect(result.isErr()).toBe(true);
  });
});
