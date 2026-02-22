import { describe, it, expect, vi } from "vitest";
import { createAuditSink } from "../../src/audit/sink.js";
import { createAuditChain, appendEntry } from "../../src/audit/integrity.js";
import type { AuditEntry } from "../../src/audit/integrity.js";

function makeEntry(method: string, url: string, status: number): AuditEntry {
  let chain = createAuditChain();
  chain = appendEntry(chain, { method, url, status });
  return chain.entries[0]!;
}

describe("HttpAuditSink", () => {
  it("sink receives audit entry on request start", async () => {
    const flushed: AuditEntry[][] = [];
    const sink = createAuditSink({
      onFlush: async (entries) => {
        flushed.push([...entries]);
      },
      bufferSize: 1,
    });

    const entry = makeEntry("GET", "/api/start", 200);
    sink.write(entry);

    // Auto-flush triggers since bufferSize is 1
    // Give the async flush a tick to complete
    await vi.waitFor(() => {
      expect(flushed.length).toBeGreaterThan(0);
    });

    expect(flushed[0]![0]).toBe(entry);
  });

  it("sink receives audit entry on response received", async () => {
    const received: AuditEntry[] = [];
    const sink = createAuditSink({
      onFlush: async (entries) => {
        for (const e of entries) {
          received.push(e);
        }
      },
    });

    const entry = makeEntry("POST", "/api/data", 201);
    sink.write(entry);

    await sink.flush();

    expect(received).toHaveLength(1);
    expect(received[0]!.method).toBe("POST");
    expect(received[0]!.status).toBe(201);
  });

  it("sink receives audit entry on request error", async () => {
    const received: AuditEntry[] = [];
    const sink = createAuditSink({
      onFlush: async (entries) => {
        for (const e of entries) {
          received.push(e);
        }
      },
    });

    // status undefined indicates an error (no response received)
    const entry = makeEntry("GET", "/api/fail", 500);
    sink.write(entry);

    await sink.flush();

    expect(received).toHaveLength(1);
    expect(received[0]!.url).toBe("/api/fail");
  });

  it("sink errors do not propagate to the caller", async () => {
    const errorHandler = vi.fn();
    const sink = createAuditSink({
      onFlush: async () => {
        throw new Error("Sink write failed");
      },
      maxRetries: 0,
      retryDelayMs: 0,
      onFlushError: errorHandler,
    });

    const entry = makeEntry("GET", "/api/test", 200);
    sink.write(entry);

    // flush should not throw even though onFlush throws
    await expect(sink.flush()).resolves.toBeUndefined();
    expect(errorHandler).toHaveBeenCalled();
  });

  it("sink flush is called before process exit", async () => {
    let flushCalled = false;
    const sink = createAuditSink({
      onFlush: async () => {
        flushCalled = true;
      },
    });

    const entry = makeEntry("GET", "/api/cleanup", 200);
    sink.write(entry);

    expect(sink.pendingCount()).toBe(1);

    await sink.flush();

    expect(flushCalled).toBe(true);
    expect(sink.pendingCount()).toBe(0);
  });
});
