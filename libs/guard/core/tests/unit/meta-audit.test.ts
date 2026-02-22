import { describe, it, expect } from "vitest";
import {
  createMetaAuditEntry,
  createDataClassificationChangeEntry,
  createNoopMetaAuditTrail,
  createMetaAuditWriteError,
} from "../../src/guard/meta-audit.js";
import { ACL011 } from "../../src/errors/codes.js";

describe("MetaAudit", () => {
  describe("createMetaAuditEntry()", () => {
    it("creates a MetaAuditEntry with all required fields", () => {
      const entry = createMetaAuditEntry({
        actorId: "auditor-1",
        accessType: "read",
        description: "Reviewed audit log for Q1 compliance",
        entryCount: 42,
        scope: "scope-prod",
      });

      expect(entry._tag).toBe("MetaAuditEntry");
      expect(typeof entry.metaAuditId).toBe("string");
      expect(entry.metaAuditId.length).toBeGreaterThan(0);
      expect(typeof entry.timestamp).toBe("string");
      expect(entry.actorId).toBe("auditor-1");
      expect(entry.accessType).toBe("read");
      expect(entry.description).toBe("Reviewed audit log for Q1 compliance");
      expect(entry.entryCount).toBe(42);
      expect(entry.scope).toBe("scope-prod");
      expect(entry.simulated).toBe(false);
    });

    it("defaults simulated to false", () => {
      const entry = createMetaAuditEntry({
        actorId: "a",
        accessType: "verify",
        description: "verify",
        entryCount: 0,
        scope: "s",
      });
      expect(entry.simulated).toBe(false);
    });

    it("allows simulated to be set to true", () => {
      const entry = createMetaAuditEntry({
        actorId: "a",
        accessType: "replay",
        description: "replay",
        entryCount: 0,
        scope: "s",
        simulated: true,
      });
      expect(entry.simulated).toBe(true);
    });

    it("includes dataClassification when provided", () => {
      const entry = createMetaAuditEntry({
        actorId: "a",
        accessType: "export",
        description: "export",
        entryCount: 100,
        scope: "s",
        dataClassification: "confidential",
      });
      expect(entry.dataClassification).toBe("confidential");
    });

    it("generates unique IDs for each entry", () => {
      const ids = new Set(
        Array.from({ length: 10 }, () =>
          createMetaAuditEntry({
            actorId: "a",
            accessType: "read",
            description: "d",
            entryCount: 0,
            scope: "s",
          }).metaAuditId,
        ),
      );
      expect(ids.size).toBe(10);
    });

    it("timestamp is ISO 8601 format", () => {
      const entry = createMetaAuditEntry({
        actorId: "a",
        accessType: "read",
        description: "d",
        entryCount: 0,
        scope: "s",
      });
      expect(() => new Date(entry.timestamp)).not.toThrow();
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    });
  });

  describe("createDataClassificationChangeEntry()", () => {
    it("creates an entry with all required fields", () => {
      const entry = createDataClassificationChangeEntry({
        actorId: "admin-1",
        scope: "scope-1",
        previousClassification: "internal",
        newClassification: "confidential",
        reason: "Regulatory requirement",
      });

      expect(entry._tag).toBe("DataClassificationChangeEntry");
      expect(typeof entry.changeId).toBe("string");
      expect(entry.actorId).toBe("admin-1");
      expect(entry.previousClassification).toBe("internal");
      expect(entry.newClassification).toBe("confidential");
      expect(entry.reason).toBe("Regulatory requirement");
    });

    it("allows previousClassification to be undefined", () => {
      const entry = createDataClassificationChangeEntry({
        actorId: "a",
        scope: "s",
        previousClassification: undefined,
        newClassification: "restricted",
        reason: "Initial classification",
      });
      expect(entry.previousClassification).toBeUndefined();
    });
  });

  describe("createNoopMetaAuditTrail()", () => {
    it("returns ok for recordAccess", () => {
      const trail = createNoopMetaAuditTrail();
      const entry = createMetaAuditEntry({
        actorId: "a",
        accessType: "read",
        description: "d",
        entryCount: 0,
        scope: "s",
      });
      const result = trail.recordAccess(entry);
      expect(result.isOk()).toBe(true);
    });

    it("returns ok for recordClassificationChange", () => {
      const trail = createNoopMetaAuditTrail();
      const entry = createDataClassificationChangeEntry({
        actorId: "a",
        scope: "s",
        previousClassification: undefined,
        newClassification: "confidential",
        reason: "test",
      });
      const result = trail.recordClassificationChange(entry);
      expect(result.isOk()).toBe(true);
    });
  });

  describe("frozen objects", () => {
    it("MetaAuditEntry is frozen", () => {
      const entry = createMetaAuditEntry({
        actorId: "a",
        accessType: "read",
        description: "d",
        entryCount: 0,
        scope: "s",
      });
      expect(Object.isFrozen(entry)).toBe(true);
    });

    it("DataClassificationChangeEntry is frozen", () => {
      const entry = createDataClassificationChangeEntry({
        actorId: "a",
        scope: "s",
        previousClassification: undefined,
        newClassification: "restricted",
        reason: "test",
      });
      expect(Object.isFrozen(entry)).toBe(true);
    });
  });

  describe("accessType variants", () => {
    it("accepts all 4 accessType values", () => {
      const types: Array<"read" | "export" | "verify" | "replay"> = ["read", "export", "verify", "replay"];
      for (const accessType of types) {
        const entry = createMetaAuditEntry({
          actorId: "a",
          accessType,
          description: "d",
          entryCount: 0,
          scope: "s",
        });
        expect(entry.accessType).toBe(accessType);
      }
    });
  });

  describe("createMetaAuditWriteError()", () => {
    it("produces a frozen ACL011 error", () => {
      const error = createMetaAuditWriteError("write failed");
      expect(Object.isFrozen(error)).toBe(true);
      expect(error.code).toBe(ACL011);
      expect(error.message).toBe("write failed");
    });
  });
});
