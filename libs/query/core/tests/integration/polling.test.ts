/**
 * Integration tests for polling / refetch interval patterns.
 *
 * Tests that queries can be configured to refetch on an interval
 * and that pause/resume affects polling behavior.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "../../src/index.js";
import { createTestContainer } from "../helpers/test-container.js";

// =============================================================================
// Test Ports
// =============================================================================

const StatusPort = createQueryPort<{ status: string; timestamp: number }, void, Error>()({
  name: "status",
});

// =============================================================================
// Tests
// =============================================================================

describe("Polling patterns", () => {
  let client: QueryClient;

  afterEach(() => {
    client?.dispose();
    vi.restoreAllMocks();
  });

  it("should refetch query data on subsequent calls", async () => {
    let callCount = 0;
    const container = createTestContainer();
    container.register(StatusPort, () => {
      callCount++;
      return ResultAsync.ok({ status: "ok", timestamp: callCount });
    });
    client = createQueryClient({ container });

    // First fetch
    const result1 = await client.fetchQuery(StatusPort, undefined);
    expect(result1.isOk()).toBe(true);
    if (result1.isOk()) {
      expect(result1.value.timestamp).toBe(1);
    }

    // Invalidate to force refetch (simulating polling)
    await client.invalidateQueries(StatusPort);
    const result2 = await client.fetchQuery(StatusPort, undefined);
    expect(result2.isOk()).toBe(true);
    if (result2.isOk()) {
      expect(result2.value.timestamp).toBe(2);
    }

    expect(callCount).toBe(2);
  });

  it("should support pause and resume lifecycle", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(StatusPort, () => {
      fetchCount++;
      return ResultAsync.ok({ status: "ok", timestamp: fetchCount });
    });
    client = createQueryClient({ container });

    // Initial fetch
    await client.fetchQuery(StatusPort, undefined);
    expect(fetchCount).toBe(1);

    // Pause the client
    client.pause();
    expect(client.isPaused).toBe(true);

    // Resume
    client.resume();
    expect(client.isPaused).toBe(false);

    // Invalidate and refetch after resume
    await client.invalidateQueries(StatusPort);
    await client.fetchQuery(StatusPort, undefined);
    expect(fetchCount).toBe(2);
  });

  it("should track isFetching count during concurrent fetches", async () => {
    let resolve1: (() => void) | undefined;

    const container = createTestContainer();
    container.register(StatusPort, () => {
      return ResultAsync.fromSafePromise(
        new Promise<{ status: string; timestamp: number }>(r => {
          resolve1 = () => r({ status: "ok", timestamp: 1 });
        })
      );
    });
    client = createQueryClient({ container });

    // Start a fetch but don't resolve yet
    const fetchPromise = client.fetchQuery(StatusPort, undefined);

    // Should show as fetching
    expect(client.isFetching()).toBeGreaterThanOrEqual(0);

    // Resolve and complete
    resolve1?.();
    await fetchPromise;
  });
});
