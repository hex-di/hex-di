import { describe, it, expect } from "vitest";
import { createQueryPort } from "@hex-di/query";
import { createMockQueryFetcher } from "../src/mock-adapters.js";
import { expectCacheEntry } from "../src/cache-assertions.js";
import { createQueryTestContainer } from "../src/test-container.js";

// =============================================================================
// Test Ports
// =============================================================================

interface User {
  readonly id: string;
  readonly name: string;
}

interface ApiError {
  readonly _tag: string;
  readonly message: string;
}

const UsersPort = createQueryPort<User[], void, ApiError>()({ name: "CacheUsers" });

// =============================================================================
// expectCacheEntry
// =============================================================================

describe("expectCacheEntry", () => {
  it("toExist passes when cache entry exists", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    await container.queryClient.fetchQuery(UsersPort, undefined);

    expectCacheEntry(container.queryClient, UsersPort, undefined).toExist();

    container.dispose();
  });

  it("toNotExist passes when cache entry does not exist", () => {
    const container = createQueryTestContainer();

    expectCacheEntry(container.queryClient, UsersPort, undefined).toNotExist();

    container.dispose();
  });

  it("toExist fails when cache entry does not exist", () => {
    const container = createQueryTestContainer();

    expect(() => expectCacheEntry(container.queryClient, UsersPort, undefined).toExist()).toThrow();

    container.dispose();
  });

  it("toNotExist fails when cache entry exists", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    await container.queryClient.fetchQuery(UsersPort, undefined);

    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toNotExist()
    ).toThrow();

    container.dispose();
  });

  it("toHaveData passes when data matches", async () => {
    const users: User[] = [{ id: "1", name: "Alice" }];
    const fetcher = createMockQueryFetcher(UsersPort, { data: users });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    await container.queryClient.fetchQuery(UsersPort, undefined);

    expectCacheEntry(container.queryClient, UsersPort, undefined).toHaveData(users);

    container.dispose();
  });

  it("toHaveData fails when data does not match", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    await container.queryClient.fetchQuery(UsersPort, undefined);

    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toHaveData([
        { id: "2", name: "Bob" },
      ])
    ).toThrow();

    container.dispose();
  });

  it("toBeFresh passes when entry is not invalidated", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    await container.queryClient.fetchQuery(UsersPort, undefined);

    expectCacheEntry(container.queryClient, UsersPort, undefined).toBeFresh();

    container.dispose();
  });

  it("toBeStale passes when entry is invalidated", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    await container.queryClient.fetchQuery(UsersPort, undefined);
    await container.queryClient.invalidateQueries(UsersPort);

    expectCacheEntry(container.queryClient, UsersPort, undefined).toBeStale();

    container.dispose();
  });

  it("toBeStale fails when entry is fresh", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    await container.queryClient.fetchQuery(UsersPort, undefined);

    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toBeStale()
    ).toThrow();

    container.dispose();
  });

  it("toHaveObserverCount passes with correct count", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    await container.queryClient.fetchQuery(UsersPort, undefined);

    expectCacheEntry(container.queryClient, UsersPort, undefined).toHaveObserverCount(0);

    container.dispose();
  });

  it("toBeFresh fails when entry is stale", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    await container.queryClient.fetchQuery(UsersPort, undefined);
    await container.queryClient.invalidateQueries(UsersPort);

    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toBeFresh()
    ).toThrow();

    container.dispose();
  });

  it("toHaveObserverCount fails with wrong count", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    await container.queryClient.fetchQuery(UsersPort, undefined);

    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toHaveObserverCount(5)
    ).toThrow();

    container.dispose();
  });
});
