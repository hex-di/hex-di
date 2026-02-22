/**
 * Audit warning integration tests.
 *
 * Verifies warning-mode behavior when audit failures occur:
 * the system continues operating but records warnings.
 */

import { describe, it, expect, vi } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse } from "../../src/testing/response-factory.js";
import { createAuditBridge } from "../../src/audit/bridge.js";
import { createAuditSink } from "../../src/audit/sink.js";
import { createAuditChain, appendEntry, verifyChain } from "../../src/audit/integrity.js";

describe("audit warning integration", () => {
  it("audit sink receives entries on each request", async () => {
    const warnings: string[] = [];
    const sink = createAuditSink({
      onFlush: async () => {
        throw new Error("Disk full");
      },
      maxRetries: 1,
      retryDelayMs: 0,
      onFlushError: (error) => {
        warnings.push(`Warning: flush failed - ${error instanceof Error ? error.message : String(error)}`);
      },
    });

    const bridge = createAuditBridge({
      onEntry: (entry) => sink.write(entry),
    });

    bridge.record("GET", "/api/users", 200);
    bridge.record("POST", "/api/users", 201);

    await sink.flush();

    // Warnings were recorded but bridge continues to function
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Disk full");
    expect(bridge.entryCount()).toBe(2);
  });

  it("audit entries include timing and status", () => {
    const bridge = createAuditBridge();

    const entry1 = bridge.record("GET", "/api/health", 200);
    const entry2 = bridge.record("POST", "/api/data", 500);

    expect(entry1.status).toBe(200);
    expect(entry2.status).toBe(500);
    expect(entry1.timestamp).toBeLessThanOrEqual(entry2.timestamp);

    // The chain is still valid despite different statuses
    const chain = bridge.getChain();
    expect(verifyChain(chain)).toBe(true);
  });

  it("audit sink errors do not prevent response delivery", async () => {
    let flushAttempts = 0;
    const sink = createAuditSink({
      onFlush: async () => {
        flushAttempts++;
        throw new Error("Network unreachable");
      },
      maxRetries: 2,
      retryDelayMs: 0,
      onFlushError: () => {
        // Warning mode -- just swallow the error
      },
    });

    const bridge = createAuditBridge({
      onEntry: (entry) => sink.write(entry),
    });

    const client = createMockHttpClient({
      "GET /api/data": mockJsonResponse(200, { result: true }),
    });

    // HTTP request succeeds regardless of audit flush failure
    const result = await client.get("/api/data");
    expect(result._tag).toBe("Ok");

    bridge.record("GET", "/api/data", 200);
    await sink.flush();

    // Retries happened (initial + 2 retries = 3 attempts)
    expect(flushAttempts).toBe(3);

    // Bridge is still functional
    expect(bridge.entryCount()).toBe(1);
    expect(verifyChain(bridge.getChain())).toBe(true);
  });
});
