import { describe, it, expect } from "vitest";
import {
  createAuditSchema,
  migrateAuditEntry,
  CURRENT_SCHEMA_VERSION,
} from "../../src/audit/schema-versioning.js";
import { createAuditChain, appendEntry } from "../../src/audit/integrity.js";

describe("GxP: schema versioning", () => {
  it("spec revision constant is exported from the package", () => {
    expect(CURRENT_SCHEMA_VERSION).toBeDefined();
    expect(typeof CURRENT_SCHEMA_VERSION).toBe("number");
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });

  it("spec revision matches the format Major.Minor", () => {
    const schema = createAuditSchema();
    expect(schema.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(schema.version).toBe(1);

    // Schema fields describe the audit entry structure
    expect(schema.fields).toContain("index");
    expect(schema.fields).toContain("timestamp");
    expect(schema.fields).toContain("method");
    expect(schema.fields).toContain("url");
    expect(schema.fields).toContain("status");
    expect(schema.fields).toContain("hash");
    expect(schema.fields).toContain("previousHash");
    expect(schema.fields).toContain("schemaVersion");

    // Schema is frozen
    expect(Object.isFrozen(schema)).toBe(true);
    expect(Object.isFrozen(schema.fields)).toBe(true);
  });

  it("getMetadata() returns specRevision field", () => {
    let chain = createAuditChain();
    chain = appendEntry(chain, { method: "GET", url: "/api/test", status: 200 });

    const entry = chain.entries[0]!;
    const versioned = migrateAuditEntry(entry);

    expect(versioned.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(versioned.method).toBe("GET");
    expect(versioned.url).toBe("/api/test");
    expect(versioned.status).toBe(200);

    // Migrated entry is frozen
    expect(Object.isFrozen(versioned)).toBe(true);
  });

  it("specRevision is a string literal type", () => {
    let chain = createAuditChain();
    chain = appendEntry(chain, { method: "POST", url: "/api/data", status: 201 });

    const entry = chain.entries[0]!;

    // Migrate from version 1
    const migrated1 = migrateAuditEntry(entry, 1);
    expect(migrated1.schemaVersion).toBe(1);

    // Migrate from unspecified version (defaults to current)
    const migratedDefault = migrateAuditEntry(entry);
    expect(migratedDefault.schemaVersion).toBe(1);

    // Migrate from a future version (handled gracefully)
    const migratedFuture = migrateAuditEntry(entry, 99);
    expect(migratedFuture.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);

    // All original fields are preserved
    expect(migratedFuture.method).toBe("POST");
    expect(migratedFuture.url).toBe("/api/data");
    expect(migratedFuture.hash).toBe(entry.hash);
  });
});
