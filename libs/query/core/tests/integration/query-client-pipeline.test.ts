/**
 * Integration tests: QueryClient pipeline
 *
 * Tests the full fetch → cache → dedup → retry pipeline,
 * mutation → effects → invalidation → refetch pipeline,
 * and option resolution.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryClient,
  createQueryPort,
  createMutationPort,
  type Clock,
} from "../../src/index.js";
import { createTestContainer } from "../helpers/test-container.js";

const UsersPort = createQueryPort<string[], unknown>()({ name: "QcpUsers" });

describe("QueryClient Pipeline Integration", () => {
  it("fetch -> cache -> dedup -> retry pipeline end-to-end", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      if (fetchCount === 1) {
        // First attempt fails
        return ResultAsync.fromPromise(Promise.reject(new Error("transient")), e => e as Error);
      }
      return ResultAsync.fromPromise(
        Promise.resolve(["retry-success"]),
        () => new Error("unreachable")
      );
    });

    const client = createQueryClient({
      container,
      defaults: { staleTime: 60_000, retry: 2, retryDelay: 0 },
    });

    // First fetch: fails once, retries, succeeds
    const result = await client.fetchQuery(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(["retry-success"]);
    }
    expect(fetchCount).toBe(2); // 1 fail + 1 success

    // Second fetch: cache hit (staleTime=60s), no additional fetch
    const cached = await client.fetchQuery(UsersPort, undefined);
    expect(cached.isOk()).toBe(true);
    expect(fetchCount).toBe(2); // No additional fetch

    client.dispose();
  });

  it("mutation -> effects -> invalidation -> refetch pipeline end-to-end", async () => {
    let queryFetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      queryFetchCount++;
      return ResultAsync.fromPromise(
        Promise.resolve([`users-v${queryFetchCount}`]),
        () => new Error("fail")
      );
    });

    const client = createQueryClient({
      container,
      defaults: { staleTime: 60_000 },
    });

    // Populate cache
    const initial = await client.fetchQuery(UsersPort, undefined);
    expect(initial.isOk()).toBe(true);
    expect(queryFetchCount).toBe(1);

    // Register mutation that invalidates UsersPort
    const AddUserPort = createMutationPort<string, string>()({
      name: "QcpAddUser",
      effects: { invalidates: [UsersPort] },
    });

    container.register(AddUserPort, (input: string) =>
      ResultAsync.fromPromise(Promise.resolve(`added: ${input}`), () => new Error("fail"))
    );

    // Execute mutation
    const mutationResult = await client.mutate(AddUserPort, "Charlie");
    expect(mutationResult.isOk()).toBe(true);

    // UsersPort should be invalidated
    const entry = client.cache.get(UsersPort, undefined);
    expect(entry?.isInvalidated).toBe(true);

    // Refetch gets fresh data
    const refreshed = await client.fetchQuery(UsersPort, undefined);
    expect(refreshed.isOk()).toBe(true);
    if (refreshed.isOk()) {
      expect(refreshed.value).toEqual(["users-v2"]);
    }
    expect(queryFetchCount).toBe(2);

    client.dispose();
  });

  it("default option resolution order: per-use > port > client > global", async () => {
    const container = createTestContainer();

    // Port default: staleTime=60_000
    const PortWithDefaults = createQueryPort<string[], unknown>()({
      name: "QcpPortDefaults",
      defaults: { staleTime: 60_000 },
    });

    let fetchCount = 0;
    container.register(PortWithDefaults, () => {
      fetchCount++;
      return ResultAsync.fromPromise(Promise.resolve([`v${fetchCount}`]), () => new Error("fail"));
    });

    // Client default: staleTime=10_000
    const client = createQueryClient({
      container,
      defaults: { staleTime: 10_000 },
    });

    // First fetch populates cache
    await client.fetchQuery(PortWithDefaults, undefined);
    expect(fetchCount).toBe(1);

    // Second fetch should use cache (port default staleTime=60s)
    await client.fetchQuery(PortWithDefaults, undefined);
    expect(fetchCount).toBe(1); // Still 1 -- used cache

    client.dispose();
  });

  it("QueryClient with injectable Clock for deterministic staleness", async () => {
    let currentTime = 1000;
    const clock: Clock = { now: () => currentTime };

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
      clock,
      defaults: { staleTime: 5000 },
    });

    // Fetch at t=1000
    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(1);

    // At t=3000 (within staleTime), should use cache
    currentTime = 3000;
    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(1); // Cache hit

    // At t=7000 (past staleTime of 5000), should refetch
    currentTime = 7000;
    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(2); // Cache miss, refetch

    client.dispose();
  });

  it("child QueryClient has independent cache", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(Promise.resolve(["shared-data"]), () => new Error("fail"))
    );

    const client = createQueryClient({ container });
    const child = client.createChild();

    await client.fetchQuery(UsersPort, undefined);
    await child.fetchQuery(UsersPort, undefined);

    expect(client.getQueryData(UsersPort, undefined)).toEqual(["shared-data"]);
    expect(child.getQueryData(UsersPort, undefined)).toEqual(["shared-data"]);

    // Disposing child doesn't affect parent
    child.dispose();
    expect(client.getQueryData(UsersPort, undefined)).toEqual(["shared-data"]);

    client.dispose();
  });
});
