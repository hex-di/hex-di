/**
 * Audit sink integration tests.
 *
 * Verifies that the audit sink correctly receives entries when combined
 * with an audit bridge recording HTTP operations.
 */

import { describe, it, expect, vi } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { createAuditBridge } from "../../src/audit/bridge.js";
import { createAuditSink } from "../../src/audit/sink.js";
import { verifyChain } from "../../src/audit/integrity.js";

describe("audit sink integration", () => {
  it("audit sink receives entries on each request", async () => {
    const flushedEntries: unknown[] = [];
    const sink = createAuditSink({
      onFlush: async (entries) => {
        flushedEntries.push(...entries);
      },
      bufferSize: 10,
    });

    const bridge = createAuditBridge({
      onEntry: (entry) => sink.write(entry),
    });

    const client = createMockHttpClient({
      "GET /api/users": mockJsonResponse(200, []),
      "POST /api/users": mockJsonResponse(201, { id: 1 }),
    });

    // Simulate recording request/response audit entries
    const r1 = await client.get("/api/users");
    if (r1._tag === "Ok") {
      bridge.record("GET", "/api/users", r1.value.status);
    }

    const r2 = await client.post("/api/users", { json: { name: "Alice" } });
    if (r2._tag === "Ok") {
      bridge.record("POST", "/api/users", r2.value.status);
    }

    expect(bridge.entryCount()).toBe(2);
    expect(sink.pendingCount()).toBe(2);

    await sink.flush();
    expect(flushedEntries).toHaveLength(2);
  });

  it("audit entries include timing and status", async () => {
    const bridge = createAuditBridge();

    const client = createMockHttpClient({
      "GET /api/health": mockJsonResponse(200, { ok: true }),
    });

    const result = await client.get("/api/health");
    if (result._tag === "Ok") {
      const entry = bridge.record("GET", "/api/health", result.value.status);

      expect(entry.method).toBe("GET");
      expect(entry.url).toBe("/api/health");
      expect(entry.status).toBe(200);
      expect(entry.timestamp).toBeTypeOf("number");
      expect(entry.timestamp).toBeGreaterThan(0);
      expect(entry.hash).toBeTypeOf("string");
      expect(entry.hash).toHaveLength(8);
    }
  });

  it("audit sink errors do not prevent response delivery", async () => {
    const errorHandler = vi.fn();
    const sink = createAuditSink({
      onFlush: async () => {
        throw new Error("Sink write failed");
      },
      maxRetries: 0,
      onFlushError: errorHandler,
    });

    const bridge = createAuditBridge({
      onEntry: (entry) => sink.write(entry),
    });

    const client = createMockHttpClient({
      "GET /api/data": mockJsonResponse(200, { value: 42 }),
    });

    // The request still succeeds
    const result = await client.get("/api/data");
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }

    // Record audit entry and attempt flush
    bridge.record("GET", "/api/data", 200);
    await sink.flush();

    // Error handler was called but the HTTP request was unaffected
    expect(errorHandler).toHaveBeenCalledOnce();
  });
});
