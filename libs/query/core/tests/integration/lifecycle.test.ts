/**
 * Integration tests: Query lifecycle
 *
 * Tests the full query lifecycle from mount through success/error/retry.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createQueryClient, createQueryPort } from "../../src/index.js";
import { createTestContainer } from "../helpers/test-container.js";

const UsersPort = createQueryPort<string[], unknown>()({ name: "LfcUsers" });

describe("Query Lifecycle Integration", () => {
  it("full lifecycle: mount -> loading -> success -> data available", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(Promise.resolve(["Alice", "Bob"]), () => new Error("fail"))
    );
    const client = createQueryClient({ container });

    // Initially no data
    expect(client.getQueryData(UsersPort, undefined)).toBeUndefined();

    // Fetch triggers loading -> success
    const result = await client.fetchQuery(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(["Alice", "Bob"]);
    }

    // Data is now in cache
    expect(client.getQueryData(UsersPort, undefined)).toEqual(["Alice", "Bob"]);
    client.dispose();
  });

  it("full lifecycle: mount -> loading -> error -> retry -> success", async () => {
    let attempt = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      attempt++;
      if (attempt < 3) {
        return ResultAsync.fromPromise(
          Promise.reject(new Error(`fail-${attempt}`)),
          e => e as Error
        );
      }
      return ResultAsync.fromPromise(
        Promise.resolve(["success-data"]),
        () => new Error("unreachable")
      );
    });

    const client = createQueryClient({
      container,
      defaults: { retry: 3, retryDelay: 0 },
    });

    const result = await client.fetchQuery(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(["success-data"]);
    }
    expect(attempt).toBe(3);
    client.dispose();
  });

  it("full lifecycle: mount -> loading -> error -> all retries exhausted", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(Promise.reject(new Error("persistent-error")), e => e as Error)
    );

    const client = createQueryClient({
      container,
      defaults: { retry: 2, retryDelay: 0 },
    });

    const result = await client.fetchQuery(UsersPort, undefined);
    expect(result.isErr()).toBe(true);
    client.dispose();
  });

  it("refetch: success -> invalidate -> refetching -> new success", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(
        Promise.resolve([`data-${fetchCount}`]),
        () => new Error("fail")
      );
    });

    const client = createQueryClient({
      container,
      defaults: { staleTime: 60_000 },
    });

    // Initial fetch
    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(1);
    expect(client.getQueryData(UsersPort, undefined)).toEqual(["data-1"]);

    // Invalidate marks the entry as stale
    await client.invalidateQueries(UsersPort);
    const entry = client.cache.get(UsersPort, undefined);
    expect(entry?.isInvalidated).toBe(true);

    // Fetch again -- should refetch because invalidated
    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(2);
    expect(client.getQueryData(UsersPort, undefined)).toEqual(["data-2"]);

    client.dispose();
  });

  it("dedup: concurrent mounts trigger single fetch, both receive data", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.fromPromise(
        new Promise<string[]>(resolve => {
          setTimeout(() => resolve(["deduped-data"]), 10);
        }),
        () => new Error("fail")
      );
    });

    const client = createQueryClient({ container });

    // Launch two concurrent fetches
    const [result1, result2] = await Promise.all([
      client.fetchQuery(UsersPort, undefined),
      client.fetchQuery(UsersPort, undefined),
    ]);

    // Both should succeed with the same data
    expect(result1.isOk()).toBe(true);
    expect(result2.isOk()).toBe(true);
    if (result1.isOk() && result2.isOk()) {
      expect(result1.value).toEqual(["deduped-data"]);
      expect(result2.value).toEqual(["deduped-data"]);
    }

    // Only one actual fetch should have occurred
    expect(fetchCount).toBe(1);
    client.dispose();
  });
});
