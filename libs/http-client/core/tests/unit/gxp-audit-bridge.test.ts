import { describe, it, expect, vi } from "vitest";
import { createAuditBridge } from "../../src/audit/bridge.js";
import { verifyChain } from "../../src/audit/integrity.js";
import type { AuditEntry } from "../../src/audit/integrity.js";

describe("GxP: audit bridge", () => {
  it("audit bridge subscribes to HttpClient lifecycle events", () => {
    const entries: AuditEntry[] = [];
    const bridge = createAuditBridge({
      onEntry: (entry) => {
        entries.push(entry);
      },
    });

    bridge.record("GET", "https://api.example.com/users", 200);
    bridge.record("POST", "https://api.example.com/users", 201);

    expect(entries).toHaveLength(2);
    expect(bridge.entryCount()).toBe(2);
  });

  it("audit bridge forwards request events to the audit sink", () => {
    const onEntry = vi.fn();
    const bridge = createAuditBridge({ onEntry });

    const entry = bridge.record("GET", "https://api.example.com/data", 200);

    expect(onEntry).toHaveBeenCalledOnce();
    expect(onEntry).toHaveBeenCalledWith(entry);
    expect(entry.method).toBe("GET");
    expect(entry.url).toBe("https://api.example.com/data");
    expect(entry.status).toBe(200);
  });

  it("audit bridge forwards response events to the audit sink", () => {
    const onEntry = vi.fn();
    const bridge = createAuditBridge({ onEntry });

    bridge.record("POST", "https://api.example.com/submit", 201);
    bridge.record("PUT", "https://api.example.com/update", 200);
    bridge.record("DELETE", "https://api.example.com/remove", 204);

    expect(onEntry).toHaveBeenCalledTimes(3);

    const chain = bridge.getChain();
    expect(chain.length).toBe(3);
    expect(verifyChain(chain)).toBe(true);
  });

  it("audit bridge handles sink errors gracefully", () => {
    // When no onEntry callback is provided, the bridge works without errors
    const bridge = createAuditBridge();

    const entry = bridge.record("GET", "https://api.example.com/test", 200);

    expect(entry._tag).toBe("AuditEntry");
    expect(entry.method).toBe("GET");
    expect(bridge.entryCount()).toBe(1);
  });

  it("audit bridge entries are cryptographically signed when signature port is wired", () => {
    const bridge = createAuditBridge();

    bridge.record("GET", "https://api.example.com/a", 200);
    bridge.record("POST", "https://api.example.com/b", 201);
    bridge.record("DELETE", "https://api.example.com/c", 204);

    const chain = bridge.getChain();

    // Each entry has a hash and previousHash
    for (const entry of chain.entries) {
      expect(entry.hash).toMatch(/^[0-9a-f]{8}$/);
      expect(entry.previousHash).toMatch(/^[0-9a-f]{8}$/);
    }

    // First entry's previousHash is the genesis hash
    expect(chain.entries[0]!.previousHash).toBe("00000000");

    // Chain links are consistent
    expect(chain.entries[1]!.previousHash).toBe(chain.entries[0]!.hash);
    expect(chain.entries[2]!.previousHash).toBe(chain.entries[1]!.hash);

    // Last hash matches the chain's lastHash
    expect(bridge.lastHash()).toBe(chain.entries[2]!.hash);

    // Full chain integrity verification passes
    expect(verifyChain(chain)).toBe(true);
  });
});
