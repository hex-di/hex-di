import { describe, it, expect } from "vitest";
import { createQueryPort } from "@hex-di/query";
import { createMockQueryFetcher } from "../src/mock-adapters.js";
import { expectCacheEntry } from "../src/cache-assertions.js";
import { createQueryTestContainer } from "../src/test-container.js";

// =============================================================================
// Test Port
// =============================================================================

interface User {
  readonly id: string;
  readonly name: string;
}

interface ApiError {
  readonly _tag: string;
  readonly message: string;
}

const UsersPort = createQueryPort<User[], void, ApiError>()({ name: "CacheMutUsers" });

// =============================================================================
// Guard clause mutation killers
//
// Each assertion method (toHaveData, toBeStale, toBeFresh, toHaveObserverCount)
// has the pattern:
//   expect(entry).toBeDefined();
//   if (entry === undefined) return;
//   expect(entry.someField)...
//
// Mutants:
// 1. Remove `expect(entry).toBeDefined()` → entry-undefined case silently passes
// 2. Negate guard → entry-defined case returns early, assertions skipped
//
// To kill: test each method with entry UNDEFINED (exercises the toBeDefined assert)
// and with entry DEFINED + WRONG value (exercises the post-guard assertion).
// =============================================================================

describe("expectCacheEntry guard clause mutation killers", () => {
  // --- toHaveData: entry does NOT exist ---
  it("toHaveData fails when cache entry does not exist", () => {
    const container = createQueryTestContainer();

    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toHaveData([
        { id: "1", name: "Alice" },
      ])
    ).toThrow();

    container.dispose();
  });

  // --- toHaveData: entry exists but data is WRONG ---
  it("toHaveData fails when entry exists but data does not match", async () => {
    const container = createQueryTestContainer();
    container.register(
      UsersPort,
      createMockQueryFetcher(UsersPort, { data: [{ id: "1", name: "Alice" }] })
    );
    await container.queryClient.fetchQuery(UsersPort, undefined);

    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toHaveData([
        { id: "2", name: "Bob" },
      ])
    ).toThrow();

    container.dispose();
  });

  // --- toBeStale: entry does NOT exist ---
  it("toBeStale fails when cache entry does not exist", () => {
    const container = createQueryTestContainer();

    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toBeStale()
    ).toThrow();

    container.dispose();
  });

  // --- toBeStale: entry exists but is FRESH (not invalidated) ---
  it("toBeStale fails when entry exists but is fresh", async () => {
    const container = createQueryTestContainer();
    container.register(
      UsersPort,
      createMockQueryFetcher(UsersPort, { data: [{ id: "1", name: "Alice" }] })
    );
    await container.queryClient.fetchQuery(UsersPort, undefined);

    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toBeStale()
    ).toThrow();

    container.dispose();
  });

  // --- toBeFresh: entry does NOT exist ---
  it("toBeFresh fails when cache entry does not exist", () => {
    const container = createQueryTestContainer();

    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toBeFresh()
    ).toThrow();

    container.dispose();
  });

  // --- toBeFresh: entry exists but is STALE (invalidated) ---
  it("toBeFresh fails when entry exists but is stale", async () => {
    const container = createQueryTestContainer();
    container.register(
      UsersPort,
      createMockQueryFetcher(UsersPort, { data: [{ id: "1", name: "Alice" }] })
    );
    await container.queryClient.fetchQuery(UsersPort, undefined);
    await container.queryClient.invalidateQueries(UsersPort);

    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toBeFresh()
    ).toThrow();

    container.dispose();
  });

  // --- toHaveObserverCount: entry does NOT exist ---
  it("toHaveObserverCount fails when cache entry does not exist", () => {
    const container = createQueryTestContainer();

    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toHaveObserverCount(0)
    ).toThrow();

    container.dispose();
  });

  // --- toHaveObserverCount: entry exists but count is WRONG ---
  it("toHaveObserverCount fails when entry exists but count does not match", async () => {
    const container = createQueryTestContainer();
    container.register(
      UsersPort,
      createMockQueryFetcher(UsersPort, { data: [{ id: "1", name: "Alice" }] })
    );
    await container.queryClient.fetchQuery(UsersPort, undefined);

    // No observers subscribed, so count is 0. Assert a wrong count.
    expect(() =>
      expectCacheEntry(container.queryClient, UsersPort, undefined).toHaveObserverCount(5)
    ).toThrow();

    container.dispose();
  });
});
