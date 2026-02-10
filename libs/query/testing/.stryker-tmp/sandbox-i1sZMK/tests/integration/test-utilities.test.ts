// @ts-nocheck
import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort } from "@hex-di/query";
import {
  createMockQueryFetcher,
  createSpyQueryAdapter,
  createQueryTestContainer,
  createQueryTestScope,
  expectCacheEntry,
  expectQueryResult,
} from "../../src/index.js";

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

const UsersPort = createQueryPort<User[], void, ApiError>()({
  name: "IntegrationUsers",
});

const UserByIdPort = createQueryPort<User, { id: string }, ApiError>()({
  name: "IntegrationUserById",
});

// =============================================================================
// DoD Section 11.6: Integration Tests
// =============================================================================

describe("Integration: test utilities end-to-end", () => {
  it("full test flow: create container → register mock → fetch → assert cache → dispose", async () => {
    const container = createQueryTestContainer();

    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ],
    });
    container.register(UsersPort, fetcher);

    const result = await container.queryClient.fetchQuery(UsersPort, undefined);

    expectQueryResult(result).toBeOk([
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ]);

    expectCacheEntry(container.queryClient, UsersPort, undefined).toExist();
    expectCacheEntry(container.queryClient, UsersPort, undefined).toHaveData([
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ]);
    expectCacheEntry(container.queryClient, UsersPort, undefined).toBeFresh();

    container.dispose();
    expect(container.queryClient.isDisposed).toBe(true);
  });

  it("scope isolation: two createQueryTestScope instances have independent caches", async () => {
    const scope1 = createQueryTestScope();
    const scope2 = createQueryTestScope();

    const fetcher1 = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });
    const fetcher2 = createMockQueryFetcher(UsersPort, {
      data: [{ id: "2", name: "Bob" }],
    });

    scope1.register(UsersPort, fetcher1);
    scope2.register(UsersPort, fetcher2);

    await scope1.queryClient.fetchQuery(UsersPort, undefined);
    await scope2.queryClient.fetchQuery(UsersPort, undefined);

    // Each scope has its own cache with different data
    expectCacheEntry(scope1.queryClient, UsersPort, undefined).toHaveData([
      { id: "1", name: "Alice" },
    ]);
    expectCacheEntry(scope2.queryClient, UsersPort, undefined).toHaveData([
      { id: "2", name: "Bob" },
    ]);

    // Invalidating one scope does not affect the other
    await scope1.queryClient.invalidateQueries(UsersPort);
    expectCacheEntry(scope1.queryClient, UsersPort, undefined).toBeStale();
    expectCacheEntry(scope2.queryClient, UsersPort, undefined).toBeFresh();

    scope1.dispose();
    scope2.dispose();
  });

  it("spy tracks through pipeline: spy adapter records calls when fetched through full QueryClient pipeline", async () => {
    const container = createQueryTestContainer();

    const spy = createSpyQueryAdapter(UserByIdPort, params =>
      ResultAsync.ok({ id: params.id, name: `User ${params.id}` })
    );
    container.register(UserByIdPort, spy.fetcher);

    // Fetch through the full QueryClient pipeline
    const result1 = await container.queryClient.fetchQuery(UserByIdPort, { id: "42" });
    expectQueryResult(result1).toBeOk({ id: "42", name: "User 42" });

    // Verify spy recorded the call
    expect(spy.callCount).toBe(1);
    expect(spy.calls[0].params).toEqual({ id: "42" });

    // Second fetch with different params
    const result2 = await container.queryClient.fetchQuery(UserByIdPort, { id: "99" });
    expectQueryResult(result2).toBeOk({ id: "99", name: "User 99" });

    expect(spy.callCount).toBe(2);
    expect(spy.lastCall?.params).toEqual({ id: "99" });

    // Verify both results are cached
    expectCacheEntry(container.queryClient, UserByIdPort, { id: "42" }).toExist();
    expectCacheEntry(container.queryClient, UserByIdPort, { id: "99" }).toExist();

    container.dispose();
  });
});
