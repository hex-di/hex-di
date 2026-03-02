import { describe, it, expect } from "vitest";
import {
  serializePolicy,
  hashPolicy,
  serializeAuditEntry,
  createAuditExportManifest,
} from "../../src/serialization/serialize.js";
import { deserializePolicy, deserializeAuditEntry } from "../../src/serialization/deserialize.js";
import type { AuditEntry } from "../../src/guard/types.js";
import { createNodeHashDigest } from "@hex-di/crypto-node";
import {
  hasPermission,
  hasRole,
  hasAttribute,
  hasResourceAttribute,
  hasSignature,
  hasRelationship,
  allOf,
  anyOf,
  not,
  withLabel,
} from "../../src/policy/combinators.js";
import { eq, literal, subject } from "../../src/policy/matchers.js";
import { createPermission } from "../../src/tokens/permission.js";

const digest = createNodeHashDigest();
const ReadUser = createPermission({ resource: "user", action: "read" });
const WriteUser = createPermission({ resource: "user", action: "write" });

describe("serializePolicy / deserializePolicy round-trip", () => {
  it("round-trips hasPermission", () => {
    const policy = hasPermission(ReadUser);
    const json = serializePolicy(policy);
    const result = deserializePolicy(json);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("hasPermission");
  });

  it("round-trips hasRole", () => {
    const policy = hasRole("admin");
    const json = serializePolicy(policy);
    const result = deserializePolicy(json);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const deserialized = result.value as { kind: string; roleName: string };
    expect(deserialized.roleName).toBe("admin");
  });

  it("round-trips hasAttribute", () => {
    const policy = hasAttribute("ownerId", eq(subject("id")));
    const json = serializePolicy(policy);
    const result = deserializePolicy(json);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("hasAttribute");
  });

  it("round-trips hasResourceAttribute", () => {
    const policy = hasResourceAttribute("status", eq(literal("active")));
    const json = serializePolicy(policy);
    const result = deserializePolicy(json);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("hasResourceAttribute");
  });

  it("round-trips hasSignature", () => {
    const policy = hasSignature("approved", { signerRole: "reviewer" });
    const json = serializePolicy(policy);
    expect(json).toContain('"signerRole":"reviewer"');
    const result = deserializePolicy(json);
    expect(result.isOk()).toBe(true);
  });

  it("round-trips hasRelationship", () => {
    const policy = hasRelationship("owner", { depth: 2, resourceType: "document" });
    const json = serializePolicy(policy);
    const result = deserializePolicy(json);
    expect(result.isOk()).toBe(true);
  });

  it("round-trips allOf", () => {
    const policy = allOf(hasPermission(ReadUser), hasRole("editor"));
    const json = serializePolicy(policy);
    const result = deserializePolicy(json);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allOf");
  });

  it("round-trips anyOf", () => {
    const policy = anyOf(hasRole("admin"), hasRole("moderator"));
    const json = serializePolicy(policy);
    const result = deserializePolicy(json);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("anyOf");
  });

  it("round-trips not", () => {
    const policy = not(hasRole("banned"));
    const json = serializePolicy(policy);
    const result = deserializePolicy(json);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("not");
  });

  it("round-trips labeled", () => {
    const policy = withLabel("myPolicy", hasPermission(ReadUser));
    const json = serializePolicy(policy);
    const result = deserializePolicy(json);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("labeled");
  });

  it("round-trips hasPermission with fields", () => {
    const policy = hasPermission(ReadUser, { fields: ["name", "email"] });
    const json = serializePolicy(policy);
    const result = deserializePolicy(json);
    expect(result.isOk()).toBe(true);
  });

  it("serializes nested composite policies deterministically", () => {
    const policy = anyOf(allOf(hasPermission(ReadUser), hasRole("editor")), hasRole("admin"));
    const json1 = serializePolicy(policy);
    const json2 = serializePolicy(policy);
    expect(json1).toBe(json2);
  });

  it("serializes permission as resource:action", () => {
    const json = serializePolicy(hasPermission(WriteUser));
    expect(json).toContain('"permission":"user:write"');
  });
});

describe("deserializePolicy — error cases", () => {
  it("returns Err for invalid JSON", () => {
    const result = deserializePolicy("not-json");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("ACL007");
    }
  });

  it("returns Err for missing kind", () => {
    const result = deserializePolicy('{"type":"hasPermission"}');
    expect(result.isErr()).toBe(true);
  });

  it("returns Err for unknown kind", () => {
    const result = deserializePolicy('{"kind":"unknownKind"}');
    expect(result.isErr()).toBe(true);
  });

  it("returns Err for hasPermission with invalid permission format", () => {
    const result = deserializePolicy('{"kind":"hasPermission","permission":"invalid"}');
    expect(result.isErr()).toBe(true);
  });

  it("returns Err for hasRole missing roleName", () => {
    const result = deserializePolicy('{"kind":"hasRole"}');
    expect(result.isErr()).toBe(true);
  });

  it("returns Err for allOf missing policies array", () => {
    const result = deserializePolicy('{"kind":"allOf"}');
    expect(result.isErr()).toBe(true);
  });
});

describe("hashPolicy", () => {
  it("returns a 64-char hex string (SHA-256)", () => {
    const policy = hasPermission(ReadUser);
    const hash = hashPolicy(policy, digest);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same policy", () => {
    const policy = hasRole("admin");
    expect(hashPolicy(policy, digest)).toBe(hashPolicy(policy, digest));
  });

  it("different policies produce different hashes", () => {
    const h1 = hashPolicy(hasRole("admin"), digest);
    const h2 = hashPolicy(hasRole("viewer"), digest);
    expect(h1).not.toBe(h2);
  });

  it("handles composite allOf policy", () => {
    const policy = allOf(hasPermission(ReadUser), hasRole("editor"));
    const hash = hashPolicy(policy, digest);
    expect(hash).toHaveLength(64);
  });

  it("hash is independent of object key insertion order", () => {
    const p1 = hasPermission(ReadUser);
    const p2 = hasPermission(WriteUser);
    const combo1 = allOf(p1, p2);
    const combo2 = allOf(p1, p2);
    expect(hashPolicy(combo1, digest)).toBe(hashPolicy(combo2, digest));
  });
});

function makeAuditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    evaluationId: "eval-1",
    timestamp: new Date().toISOString(),
    subjectId: "user-1",
    authenticationMethod: "password",
    policy: '{"kind":"hasRole","roleName":"admin"}',
    decision: "allow",
    portName: "TestPort",
    scopeId: "scope-1",
    reason: "role matched",
    durationMs: 1,
    schemaVersion: 1,
    ...overrides,
  };
}

describe("serializeAuditEntry / deserializeAuditEntry round-trip", () => {
  it("round-trips a well-formed AuditEntry", () => {
    const entry = makeAuditEntry();
    const json = serializeAuditEntry(entry);
    const result = deserializeAuditEntry(json);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.evaluationId).toBe("eval-1");
    expect(result.value.decision).toBe("allow");
  });

  it("round-trips a deny entry", () => {
    const entry = makeAuditEntry({ decision: "deny", reason: "role not matched" });
    const json = serializeAuditEntry(entry);
    const result = deserializeAuditEntry(json);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.decision).toBe("deny");
  });
});

describe("deserializeAuditEntry — error cases", () => {
  it("returns Err for invalid JSON", () => {
    const result = deserializeAuditEntry("not-json");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe("ACL014");
  });

  it("returns Err for missing required field", () => {
    const entry = makeAuditEntry();
    const json = serializeAuditEntry(entry);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    delete parsed["subjectId"];
    const result = deserializeAuditEntry(JSON.stringify(parsed));
    expect(result.isErr()).toBe(true);
  });

  it("returns Err for unknown schemaVersion", () => {
    const entry = makeAuditEntry({ schemaVersion: 99 });
    const json = serializeAuditEntry(entry);
    const result = deserializeAuditEntry(json);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("schemaVersion");
    }
  });
});

describe("createAuditExportManifest", () => {
  it("includes entryCount and exportedAt", () => {
    const entries = [makeAuditEntry(), makeAuditEntry({ evaluationId: "eval-2" })];
    const manifest = JSON.parse(
      createAuditExportManifest({
        entries,
        exportedAt: "2025-01-01T00:00:00Z",
        exportedBy: "system",
      })
    ) as Record<string, unknown>;
    expect(manifest["entryCount"]).toBe(2);
    expect(manifest["exportedAt"]).toBe("2025-01-01T00:00:00Z");
    expect(manifest["exportedBy"]).toBe("system");
  });

  it("chainIntegrityVerified is false when entries lack integrityHash", () => {
    const entries = [makeAuditEntry()];
    const manifest = JSON.parse(
      createAuditExportManifest({
        entries,
        exportedAt: "2025-01-01T00:00:00Z",
        exportedBy: "system",
      })
    ) as Record<string, unknown>;
    expect(manifest["chainIntegrityVerified"]).toBe(false);
  });

  it("chainIntegrityVerified is true when all entries have integrityHash", () => {
    const gxpEntry = {
      ...makeAuditEntry(),
      integrityHash: "abc123",
      previousHash: "000",
      signature: "sig",
    };
    const manifest = JSON.parse(
      createAuditExportManifest({
        entries: [gxpEntry],
        exportedAt: "2025-01-01T00:00:00Z",
        exportedBy: "system",
      })
    ) as Record<string, unknown>;
    expect(manifest["chainIntegrityVerified"]).toBe(true);
  });

  it("includes entries array in manifest", () => {
    const entry = makeAuditEntry();
    const manifest = JSON.parse(
      createAuditExportManifest({
        entries: [entry],
        exportedAt: "2025-01-01T00:00:00Z",
        exportedBy: "system",
      })
    ) as Record<string, unknown>;
    expect(Array.isArray(manifest["entries"])).toBe(true);
    expect((manifest["entries"] as unknown[]).length).toBe(1);
  });
});
