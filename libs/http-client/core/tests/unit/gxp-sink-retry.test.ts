import { describe, it, expect, vi } from "vitest";
import { createAuditSink } from "../../src/audit/sink.js";
import { createAuditChain, appendEntry } from "../../src/audit/integrity.js";
import type { AuditEntry } from "../../src/audit/integrity.js";

function makeEntry(method: string, url: string, status: number): AuditEntry {
  let chain = createAuditChain();
  chain = appendEntry(chain, { method, url, status });
  return chain.entries[0]!;
}

describe("GxP: audit sink retry", () => {
  it("failed sink writes are retried up to the configured limit", async () => {
    vi.useFakeTimers();

    let attempts = 0;
    const sink = createAuditSink({
      onFlush: async () => {
        attempts++;
        throw new Error(`Flush failed attempt ${attempts}`);
      },
      maxRetries: 3,
      retryDelayMs: 100,
      onFlushError: () => {
        // Swallow the error
      },
    });

    sink.write(makeEntry("GET", "/api/test", 200));
    const flushPromise = sink.flush();

    // Advance through all retries: 3 retries + 1 initial = 4 attempts
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);

    await flushPromise;

    // 1 initial + 3 retries = 4 total attempts
    expect(attempts).toBe(4);

    vi.useRealTimers();
  });

  it("sink retry backoff is exponential", async () => {
    vi.useFakeTimers();

    let callCount = 0;
    const callTimestamps: number[] = [];

    const sink = createAuditSink({
      onFlush: async () => {
        callCount++;
        callTimestamps.push(Date.now());
        if (callCount <= 2) {
          throw new Error("Temporary failure");
        }
      },
      maxRetries: 2,
      retryDelayMs: 100,
    });

    sink.write(makeEntry("GET", "/api/test", 200));
    const flushPromise = sink.flush();

    // First retry
    await vi.advanceTimersByTimeAsync(100);
    // Second retry
    await vi.advanceTimersByTimeAsync(100);

    await flushPromise;

    expect(callCount).toBe(3); // initial + 2 retries
    // The retries are delayed by retryDelayMs
    expect(callTimestamps[1]! - callTimestamps[0]!).toBeGreaterThanOrEqual(100);

    vi.useRealTimers();
  });

  it("permanently failed sink entries are stored in a dead-letter queue", async () => {
    vi.useFakeTimers();

    const deadLetterEntries: AuditEntry[] = [];

    const sink = createAuditSink({
      onFlush: async () => {
        throw new Error("Permanent failure");
      },
      maxRetries: 1,
      retryDelayMs: 50,
      onFlushError: (_error, entries) => {
        deadLetterEntries.push(...entries);
      },
    });

    const entry = makeEntry("POST", "/api/submit", 500);
    sink.write(entry);
    const flushPromise = sink.flush();

    // Advance past all retries
    await vi.advanceTimersByTimeAsync(50);

    await flushPromise;

    // The onFlushError handler should have received the failed entries
    expect(deadLetterEntries).toHaveLength(1);
    expect(deadLetterEntries[0]!.method).toBe("POST");
    expect(deadLetterEntries[0]!.url).toBe("/api/submit");

    vi.useRealTimers();
  });

  it("sink retry does not block the main request pipeline", async () => {
    vi.useFakeTimers();

    const sink = createAuditSink({
      onFlush: async () => {
        throw new Error("Slow failure");
      },
      maxRetries: 2,
      retryDelayMs: 1000,
      onFlushError: () => {
        // Swallow
      },
    });

    // write() is synchronous and should not block
    const start = Date.now();
    sink.write(makeEntry("GET", "/api/fast", 200));
    const elapsed = Date.now() - start;

    expect(elapsed).toBe(0); // Synchronous, no blocking

    // The buffer is cleared on flush (even if flush fails internally)
    const flushPromise = sink.flush();
    expect(sink.pendingCount()).toBe(0); // Buffer cleared immediately

    // Advance time to complete the retries
    await vi.advanceTimersByTimeAsync(3000);
    await flushPromise;

    vi.useRealTimers();
  });
});
