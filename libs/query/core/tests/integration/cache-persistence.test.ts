/**
 * Integration tests for cache persistence patterns.
 *
 * Tests that cache state can be serialized and restored,
 * supporting offline-first and SSR hydration patterns.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { ok, ResultAsync } from "@hex-di/result";
import {
  createQueryPort,
  createQueryClient,
  type QueryClient,
  type CachePersister,
  type CacheEntry,
  type CacheKey,
} from "../../src/index.js";
import { createCacheKeyFromName } from "../../src/cache/cache-key.js";
import { createTestContainer } from "../helpers/test-container.js";

// =============================================================================
// Test Ports
// =============================================================================

const UsersPort = createQueryPort<string[], void, Error>()({ name: "users" });
const SettingsPort = createQueryPort<{ theme: string }, void, Error>()({
  name: "settings",
});

// =============================================================================
// Tests
// =============================================================================

describe("Cache persistence patterns", () => {
  let client: QueryClient;

  afterEach(() => {
    client?.dispose();
  });

  it("should populate cache via setQueryData for hydration", () => {
    const container = createTestContainer();
    client = createQueryClient({ container });

    // Simulate hydration — set data without fetching
    client.setQueryData(UsersPort, undefined, ["Alice", "Bob"]);
    client.setQueryData(SettingsPort, undefined, { theme: "dark" });

    // Data should be immediately available
    expect(client.getQueryData(UsersPort, undefined)).toEqual(["Alice", "Bob"]);
    expect(client.getQueryData(SettingsPort, undefined)).toEqual({ theme: "dark" });
  });

  it("should allow cache entries to be read via cache API", () => {
    const container = createTestContainer();
    client = createQueryClient({ container });
    client.setQueryData(UsersPort, undefined, ["Alice"]);

    // Read cache entry via port-based API
    const entry = client.cache.get(UsersPort, undefined);

    expect(entry).toBeDefined();
    expect(entry?.data).toEqual(["Alice"]);
    expect(entry?.status).toBe("success");
  });

  it("should support cache restoration between clients", () => {
    // Create source client with data
    const sourceContainer = createTestContainer();
    const source = createQueryClient({ container: sourceContainer });
    source.setQueryData(UsersPort, undefined, ["Alice", "Bob"]);

    // Read cache state from source
    const sourceData = source.getQueryData(UsersPort, undefined);
    expect(sourceData).toBeDefined();

    // Create destination client and restore
    const destContainer = createTestContainer();
    client = createQueryClient({ container: destContainer });
    if (sourceData !== undefined) {
      client.setQueryData(UsersPort, undefined, sourceData);
    }

    // Verify restoration
    expect(client.getQueryData(UsersPort, undefined)).toEqual(["Alice", "Bob"]);

    source.dispose();
  });

  it("should support removing specific cache entries", () => {
    const container = createTestContainer();
    client = createQueryClient({ container });
    client.setQueryData(UsersPort, undefined, ["Alice"]);
    client.setQueryData(SettingsPort, undefined, { theme: "dark" });

    // Remove users cache
    client.removeQueries(UsersPort);

    // Users should be gone, settings should remain
    expect(client.getQueryData(UsersPort, undefined)).toBeUndefined();
    expect(client.getQueryData(SettingsPort, undefined)).toEqual({ theme: "dark" });
  });

  it("should notify subscribers when cache is updated via setQueryData", () => {
    const container = createTestContainer();
    client = createQueryClient({ container });

    const events: string[] = [];
    client.subscribe(event => {
      events.push(event.type);
    });

    // Set data should trigger cache update event
    client.setQueryData(UsersPort, undefined, ["Alice"]);

    // Should have received at least one event
    expect(events.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// CachePersister Integration Tests
// =============================================================================

function makeEntry(data: unknown, dataUpdatedAt: number | undefined): CacheEntry<unknown, unknown> {
  return {
    result: data !== undefined ? ok(data) : undefined,
    data,
    error: null,
    status: "success" as const,
    fetchStatus: "idle",
    dataUpdatedAt,
    errorUpdatedAt: undefined,
    fetchCount: 1,
    isInvalidated: false,
  };
}

function createMockPersister(
  stored: Array<[CacheKey, CacheEntry<unknown, unknown>]> = []
): CachePersister & {
  persistQuery: ReturnType<typeof vi.fn>;
  restoreQuery: ReturnType<typeof vi.fn>;
  removeQuery: ReturnType<typeof vi.fn>;
  restoreAll: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
} {
  return {
    persistQuery: vi.fn(() => ResultAsync.ok(undefined)),
    restoreQuery: vi.fn(() => ResultAsync.ok(undefined)),
    removeQuery: vi.fn(() => ResultAsync.ok(undefined)),
    restoreAll: vi.fn(
      (): ResultAsync<ReadonlyArray<[CacheKey, CacheEntry<unknown, unknown>]>, never> =>
        ResultAsync.ok(stored)
    ),
    clear: vi.fn(() => ResultAsync.ok(undefined)),
  };
}

describe("CachePersister integration", () => {
  let client: QueryClient;

  afterEach(() => {
    client?.dispose();
  });

  it("persists on cache update via setQueryData", async () => {
    const persister = createMockPersister();
    const container = createTestContainer();
    client = createQueryClient({
      container,
      persister: { persister, buster: "v1", maxAge: 60_000 },
    });

    // Wait for restore to complete
    await new Promise(r => setTimeout(r, 0));

    client.setQueryData(UsersPort, undefined, ["Alice"]);

    expect(persister.persistQuery).toHaveBeenCalled();
    const lastCall =
      persister.persistQuery.mock.calls[persister.persistQuery.mock.calls.length - 1];
    expect(lastCall[0][0]).toBe("users");
    expect(lastCall[1].data).toEqual(["Alice"]);
  });

  it("restores entries on client creation", async () => {
    const now = Date.now();
    const busterKey = createCacheKeyFromName("__hex_query_buster__", undefined);
    const usersKey = createCacheKeyFromName("users", undefined);

    const persister = createMockPersister([
      [busterKey, makeEntry("v1", now)],
      [usersKey, makeEntry(["Bob", "Carol"], now)],
    ]);

    const container = createTestContainer();
    client = createQueryClient({
      container,
      persister: { persister, buster: "v1", maxAge: 60_000 },
    });

    // Wait for async restore to complete
    await new Promise(r => setTimeout(r, 10));

    const data = client.getQueryData(UsersPort, undefined);
    expect(data).toEqual(["Bob", "Carol"]);
  });

  it("buster change discards persisted data", async () => {
    const now = Date.now();
    const busterKey = createCacheKeyFromName("__hex_query_buster__", undefined);
    const usersKey = createCacheKeyFromName("users", undefined);

    const persister = createMockPersister([
      [busterKey, makeEntry("v1", now)],
      [usersKey, makeEntry(["old-data"], now)],
    ]);

    const container = createTestContainer();
    client = createQueryClient({
      container,
      persister: { persister, buster: "v2", maxAge: 60_000 },
    });

    // Wait for async restore
    await new Promise(r => setTimeout(r, 10));

    // Buster mismatch → clear should have been called
    expect(persister.clear).toHaveBeenCalled();

    // No data should have been restored
    const data = client.getQueryData(UsersPort, undefined);
    expect(data).toBeUndefined();
  });

  it("stale persisted entries are discarded based on maxAge", async () => {
    const now = Date.now();
    const busterKey = createCacheKeyFromName("__hex_query_buster__", undefined);
    const usersKey = createCacheKeyFromName("users", undefined);
    const settingsKey = createCacheKeyFromName("settings", undefined);

    const persister = createMockPersister([
      [busterKey, makeEntry("v1", now)],
      // This entry is 2 hours old — should be discarded with maxAge of 1 hour
      [usersKey, makeEntry(["stale-users"], now - 7_200_000)],
      // This entry is 30 minutes old — should be kept with maxAge of 1 hour
      [settingsKey, makeEntry({ theme: "dark" }, now - 1_800_000)],
    ]);

    const container = createTestContainer();
    client = createQueryClient({
      container,
      persister: { persister, buster: "v1", maxAge: 3_600_000 },
    });

    // Wait for async restore
    await new Promise(r => setTimeout(r, 10));

    // Stale entry should not be restored
    expect(client.getQueryData(UsersPort, undefined)).toBeUndefined();
    // Fresh entry should be restored
    expect(client.getQueryData(SettingsPort, undefined)).toEqual({ theme: "dark" });
  });

  it("cache entry data round-trips via Result.toJSON()", () => {
    const result = ok({ name: "Alice", age: 30 });
    const json = JSON.parse(JSON.stringify(result));

    // Verify the serialized shape
    expect(json._tag).toBe("Ok");
    expect(json.value).toEqual({ name: "Alice", age: 30 });

    // The value can be reconstructed from the JSON representation
    expect(json.value.name).toBe("Alice");
    expect(json.value.age).toBe(30);
  });
});
