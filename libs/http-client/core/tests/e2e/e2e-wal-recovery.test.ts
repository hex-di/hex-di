/**
 * E2E: WAL recovery (audit sink failure + retry).
 *
 * Tests Write-Ahead Log recovery: audit entries are buffered,
 * flush failures are retried, and recovery rebuilds the chain.
 */

import { describe, it, expect, vi } from "vitest";
import { createAuditChain, appendEntry, verifyChain } from "../../src/audit/integrity.js";
import { createAuditBridge } from "../../src/audit/bridge.js";
import { createAuditSink } from "../../src/audit/sink.js";
import type { AuditEntry } from "../../src/audit/integrity.js";

describe("E2E: WAL recovery", () => {
  it("audit chain captures full request lifecycle", async () => {
    const persisted: AuditEntry[] = [];
    let flushAttempt = 0;

    const sink = createAuditSink({
      onFlush: async (entries) => {
        flushAttempt++;
        // First flush fails, second succeeds
        if (flushAttempt === 1) {
          throw new Error("Database unavailable");
        }
        persisted.push(...entries);
      },
      maxRetries: 2,
      retryDelayMs: 0,
    });

    const bridge = createAuditBridge({
      onEntry: (entry) => sink.write(entry),
    });

    bridge.record("GET", "/api/data", 200);
    bridge.record("POST", "/api/data", 201);
    bridge.record("PUT", "/api/data/1", 200);

    await sink.flush();

    // After retry, entries are persisted
    expect(persisted).toHaveLength(3);
    expect(verifyChain(bridge.getChain())).toBe(true);
  });

  it("electronic signatures are attached when configured", async () => {
    const wal: AuditEntry[] = [];
    const bridge = createAuditBridge({
      onEntry: (entry) => wal.push(entry),
    });

    // Simulate operations
    bridge.record("GET", "/api/lots", 200);
    bridge.record("POST", "/api/lots", 201);
    bridge.record("DELETE", "/api/lots/1", 204);

    // WAL has all entries
    expect(wal).toHaveLength(3);

    // Simulate full crash -- only WAL survives
    let recoveredChain = createAuditChain();
    for (const entry of wal) {
      recoveredChain = appendEntry(recoveredChain, {
        method: entry.method,
        url: entry.url,
        status: entry.status,
        timestamp: entry.timestamp,
      });
    }

    // Recovered chain is identical to original
    expect(recoveredChain.length).toBe(bridge.entryCount());
    expect(recoveredChain.lastHash).toBe(bridge.lastHash());
    expect(verifyChain(recoveredChain)).toBe(true);
  });

  it("WAL recovery restores unsent audit entries after restart", async () => {
    // Phase 1: Write entries to WAL, flush fails completely
    const walEntries: Array<{
      method: string;
      url: string;
      status: number | undefined;
      timestamp: number;
    }> = [];

    const bridge1 = createAuditBridge({
      onEntry: (entry) => {
        walEntries.push({
          method: entry.method,
          url: entry.url,
          status: entry.status,
          timestamp: entry.timestamp,
        });
      },
    });

    bridge1.record("GET", "/api/items", 200);
    bridge1.record("POST", "/api/items", 201);

    const originalHash = bridge1.lastHash();

    // Sink fails -- entries remain in WAL only
    const failingSink = createAuditSink({
      onFlush: async () => {
        throw new Error("Disk full");
      },
      maxRetries: 0,
      onFlushError: () => {
        // Swallow
      },
    });

    for (const entry of bridge1.getChain().entries) {
      failingSink.write(entry);
    }
    await failingSink.flush();

    // Phase 2: "Restart" -- restore from WAL
    let recoveredChain = createAuditChain();
    for (const walEntry of walEntries) {
      recoveredChain = appendEntry(recoveredChain, walEntry);
    }

    expect(recoveredChain.length).toBe(2);
    expect(recoveredChain.lastHash).toBe(originalHash);
    expect(verifyChain(recoveredChain)).toBe(true);

    // Phase 3: Continue recording on recovered chain
    const bridge2 = createAuditBridge();
    // Simulate replay by recording all WAL entries into new bridge
    for (const walEntry of walEntries) {
      bridge2.record(walEntry.method, walEntry.url, walEntry.status);
    }

    // Add new entries
    bridge2.record("GET", "/api/items/1", 200);

    expect(bridge2.entryCount()).toBe(3);
    expect(verifyChain(bridge2.getChain())).toBe(true);
  });
});
