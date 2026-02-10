/**
 * Integration tests for window-focus and reconnect refetch behavior.
 *
 * Uses a custom clock to control staleness without fake timers,
 * avoiding the infinite-loop issue with setInterval-based GC.
 *
 * @vitest-environment jsdom
 * @packageDocumentation
 */

import { describe, it, expect, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "../../src/index.js";
import { createTestContainer } from "../helpers/test-container.js";

// =============================================================================
// Test Ports
// =============================================================================

const DataPort = createQueryPort<string, void, Error>()({
  name: "data",
  defaults: { staleTime: 1000 },
});

const AlwaysRefetchPort = createQueryPort<string, void, Error>()({
  name: "always-refetch-data",
  defaults: { staleTime: 60_000 },
});

// =============================================================================
// Helpers
// =============================================================================

function createCountingFetcher(responses: string[]): {
  fetcher: () => ResultAsync<string, Error>;
  callCount: () => number;
} {
  let calls = 0;
  return {
    fetcher: () => {
      const idx = calls;
      calls++;
      return ResultAsync.ok(responses[idx] ?? `response-${idx}`);
    },
    callCount: () => calls,
  };
}

/** Flush microtasks so async operations settle. */
async function flush(): Promise<void> {
  // Multiple microtask rounds to settle chained ResultAsync operations
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("window-focus refetch", () => {
  let client: QueryClient;

  afterEach(() => {
    client?.dispose();
  });

  it("refetchOnWindowFocus: true — refetches stale data on focus", async () => {
    let now = 0;
    const clock = { now: () => now };
    const { fetcher, callCount } = createCountingFetcher(["initial", "refreshed"]);
    const container = createTestContainer();
    container.register(DataPort, fetcher);
    client = createQueryClient({ container, clock, defaults: { refetchOnWindowFocus: true } });

    // Initial fetch
    const observer = client.observe(DataPort, undefined);
    await flush();
    expect(callCount()).toBe(1);

    // Advance past staleTime so data becomes stale
    now = 1500;

    // Simulate window focus event
    window.dispatchEvent(new Event("focus"));
    await flush();

    // Should have refetched because data is stale
    expect(callCount()).toBe(2);
    observer.destroy();
  });

  it("refetchOnWindowFocus: 'always' — refetches fresh data on focus", async () => {
    let now = 0;
    const clock = { now: () => now };
    const { fetcher, callCount } = createCountingFetcher(["initial", "refreshed"]);
    const container = createTestContainer();
    container.register(AlwaysRefetchPort, fetcher);
    client = createQueryClient({ container, clock, defaults: { refetchOnWindowFocus: "always" } });

    // Initial fetch
    const observer = client.observe(AlwaysRefetchPort, undefined);
    await flush();
    expect(callCount()).toBe(1);

    // Data is still fresh (staleTime is 60s), but "always" should refetch anyway
    window.dispatchEvent(new Event("focus"));
    await flush();

    expect(callCount()).toBe(2);
    observer.destroy();
  });
});

describe("reconnect refetch", () => {
  let client: QueryClient;

  afterEach(() => {
    client?.dispose();
  });

  it("refetchOnReconnect: true — refetches stale data on reconnect", async () => {
    let now = 0;
    const clock = { now: () => now };
    const { fetcher, callCount } = createCountingFetcher(["initial", "refreshed"]);
    const container = createTestContainer();
    container.register(DataPort, fetcher);
    client = createQueryClient({ container, clock, defaults: { refetchOnReconnect: true } });

    // Initial fetch
    const observer = client.observe(DataPort, undefined);
    await flush();
    expect(callCount()).toBe(1);

    // Advance past staleTime
    now = 1500;

    // Simulate network reconnect
    window.dispatchEvent(new Event("online"));
    await flush();

    // Should have refetched because data is stale
    expect(callCount()).toBe(2);
    observer.destroy();
  });

  it("refetchOnReconnect: 'always' — refetches fresh data on reconnect", async () => {
    let now = 0;
    const clock = { now: () => now };
    const { fetcher, callCount } = createCountingFetcher(["initial", "refreshed"]);
    const container = createTestContainer();
    container.register(AlwaysRefetchPort, fetcher);
    client = createQueryClient({ container, clock, defaults: { refetchOnReconnect: "always" } });

    // Initial fetch
    const observer = client.observe(AlwaysRefetchPort, undefined);
    await flush();
    expect(callCount()).toBe(1);

    // Data is still fresh, but "always" should refetch anyway
    window.dispatchEvent(new Event("online"));
    await flush();

    expect(callCount()).toBe(2);
    observer.destroy();
  });
});
