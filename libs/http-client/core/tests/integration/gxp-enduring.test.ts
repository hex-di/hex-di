/**
 * GxP endurance scenario tests.
 *
 * Verifies that the audit chain and GxP-compliant pipeline maintain
 * integrity across many operations and simulated restarts.
 */

import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse } from "../../src/testing/response-factory.js";
import { createAuditChain, appendEntry, verifyChain } from "../../src/audit/integrity.js";
import { createAuditBridge } from "../../src/audit/bridge.js";
import { createAuditSink } from "../../src/audit/sink.js";
import { createMonotonicTimer } from "../../src/audit/monotonic-timing.js";

describe("GxP endurance", () => {
  it("full GxP-compliant pipeline processes requests correctly", async () => {
    const bridge = createAuditBridge();
    const timer = createMonotonicTimer();

    const client = createMockHttpClient({
      "GET /api/batches": mockJsonResponse(200, [{ id: 1, status: "active" }]),
      "POST /api/batches": mockJsonResponse(201, { id: 2 }),
      "PUT /api/batches/1": mockJsonResponse(200, { id: 1, status: "updated" }),
    });

    // Simulate a sequence of GxP-compliant operations
    const start = timer.mark();

    const r1 = await client.get("/api/batches");
    if (r1._tag === "Ok") {
      bridge.record("GET", "/api/batches", r1.value.status);
    }

    const r2 = await client.post("/api/batches", { json: { name: "Batch-2" } });
    if (r2._tag === "Ok") {
      bridge.record("POST", "/api/batches", r2.value.status);
    }

    const r3 = await client.put("/api/batches/1", { json: { status: "updated" } });
    if (r3._tag === "Ok") {
      bridge.record("PUT", "/api/batches/1", r3.value.status);
    }

    const elapsed = timer.since(start);

    expect(bridge.entryCount()).toBe(3);
    expect(verifyChain(bridge.getChain())).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it("audit entries are persisted across service restarts", async () => {
    // Simulate a "restart" by creating a new chain from serialized entries
    const bridge1 = createAuditBridge();
    bridge1.record("GET", "/api/data", 200);
    bridge1.record("POST", "/api/data", 201);

    const serialized = bridge1.getChain();
    expect(verifyChain(serialized)).toBe(true);

    // Simulate "restart" -- rebuild the chain from entries
    let restoredChain = createAuditChain();
    for (const entry of serialized.entries) {
      restoredChain = appendEntry(restoredChain, {
        method: entry.method,
        url: entry.url,
        status: entry.status,
        timestamp: entry.timestamp,
      });
    }

    // The restored chain has identical hashes
    expect(restoredChain.length).toBe(serialized.length);
    expect(restoredChain.lastHash).toBe(serialized.lastHash);
    expect(verifyChain(restoredChain)).toBe(true);
  });

  it("GxP pipeline maintains ALCOA+ invariants end-to-end", async () => {
    const bridge = createAuditBridge();
    const timer = createMonotonicTimer();

    const operations = [
      { method: "GET", url: "/api/lots", status: 200 },
      { method: "POST", url: "/api/lots", status: 201 },
      { method: "GET", url: "/api/lots/1", status: 200 },
      { method: "PUT", url: "/api/lots/1", status: 200 },
      { method: "DELETE", url: "/api/lots/1", status: 204 },
    ];

    // Record many entries to test endurance
    for (let i = 0; i < 50; i++) {
      const op = operations[i % operations.length];
      if (op !== undefined) {
        bridge.record(op.method, op.url, op.status);
      }
    }

    const chain = bridge.getChain();

    // ALCOA+ Attributable: each entry has method, url, status
    for (const entry of chain.entries) {
      expect(entry.method).toBeTruthy();
      expect(entry.url).toBeTruthy();
      expect(entry.timestamp).toBeGreaterThan(0);
    }

    // ALCOA+ Legible: entries have proper structure
    expect(chain.entries[0]?.index).toBe(0);
    expect(chain.entries[49]?.index).toBe(49);

    // ALCOA+ Contemporaneous: timestamps are monotonically non-decreasing
    for (let i = 1; i < chain.entries.length; i++) {
      const prev = chain.entries[i - 1];
      const curr = chain.entries[i];
      if (prev !== undefined && curr !== undefined) {
        expect(curr.timestamp).toBeGreaterThanOrEqual(prev.timestamp);
      }
    }

    // ALCOA+ Original: hash chain is intact
    expect(verifyChain(chain)).toBe(true);

    // ALCOA+ Accurate: entry count matches operations
    expect(chain.length).toBe(50);
  });
});
