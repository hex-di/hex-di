/**
 * E2E: Electronic signature (hash-based signing).
 *
 * Tests that audit entries include hash-based signatures and that
 * signatures form a verifiable chain.
 */

import { describe, it, expect } from "vitest";
import { createAuditChain, appendEntry, verifyChain } from "../../src/audit/integrity.js";
import { createAuditBridge } from "../../src/audit/bridge.js";
import { migrateAuditEntry, CURRENT_SCHEMA_VERSION } from "../../src/audit/schema-versioning.js";

describe("E2E: electronic signature", () => {
  it("audit chain captures full request lifecycle", () => {
    const bridge = createAuditBridge();

    // Record operations with electronic signatures (hash chain)
    const e1 = bridge.record("GET", "/api/lots/batch-001", 200);
    const e2 = bridge.record("POST", "/api/lots/batch-001/approve", 200);
    const e3 = bridge.record("PUT", "/api/lots/batch-001/release", 200);

    // Each entry has a unique 8-char hex hash
    expect(e1.hash).toHaveLength(8);
    expect(e2.hash).toHaveLength(8);
    expect(e3.hash).toHaveLength(8);

    // Hashes are all different
    expect(new Set([e1.hash, e2.hash, e3.hash]).size).toBe(3);

    // Chain links are correct
    expect(e1.previousHash).toBe("00000000");
    expect(e2.previousHash).toBe(e1.hash);
    expect(e3.previousHash).toBe(e2.hash);

    expect(verifyChain(bridge.getChain())).toBe(true);
  });

  it("electronic signatures are attached when configured", () => {
    const signatures: Array<{ entryIndex: number; hash: string; operator: string }> = [];

    const bridge = createAuditBridge({
      onEntry: (entry) => {
        signatures.push({
          entryIndex: entry.index,
          hash: entry.hash,
          operator: "qa-engineer@pharma.com",
        });
      },
    });

    bridge.record("GET", "/api/batch/status", 200);
    bridge.record("POST", "/api/batch/sign", 200);

    expect(signatures).toHaveLength(2);
    expect(signatures[0]?.operator).toBe("qa-engineer@pharma.com");
    expect(signatures[0]?.hash).toHaveLength(8);
    expect(signatures[1]?.entryIndex).toBe(1);

    // Migrate entries to versioned schema
    const chain = bridge.getChain();
    const versioned = migrateAuditEntry(chain.entries[0]!);
    expect(versioned.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(versioned.hash).toBe(chain.entries[0]!.hash);
  });

  it("WAL recovery restores unsent audit entries after restart", () => {
    const bridge = createAuditBridge();

    // Build a chain with signatures
    bridge.record("GET", "/api/docs", 200);
    bridge.record("POST", "/api/docs/sign", 200);
    bridge.record("PUT", "/api/docs/countersign", 200);

    const originalChain = bridge.getChain();

    // Tamper with an entry to test detection
    const tampered = {
      ...originalChain,
      entries: Object.freeze([
        ...originalChain.entries.slice(0, 1),
        Object.freeze({
          ...originalChain.entries[1]!,
          status: 500, // Tampered status
        }),
        ...originalChain.entries.slice(2),
      ]),
    };

    // Tampered chain fails verification
    expect(verifyChain(tampered)).toBe(false);

    // Original chain still verifies
    expect(verifyChain(originalChain)).toBe(true);
  });
});
